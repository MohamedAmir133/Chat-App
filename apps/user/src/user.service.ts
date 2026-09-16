import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { UserProfileEntity, UserEntity, UserRole } from '@libs/database';
import { BlockedUser, BlockedUserDocument } from '@libs/database';
import Redis from 'ioredis';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';

/*eslint-disable*/

const PROFILE_CACHE_TTL = 300; // 5 minutes
const BLOCKED_CACHE_TTL = 600; // 10 minutes
const PRESENCE_TTL = 30; // 30 seconds

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profileRepo: Repository<UserProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectModel(BlockedUser.name)
    private readonly blockedModel: Model<BlockedUserDocument>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // (Redis presence tracking disabled — now handled by PresenceService in gateway)

  async setOnline(userId: string) {
    // No-op: presence is now tracked by socket connections in PresenceService
    Logger.log(`setOnline event received for ${userId} (handled by PresenceService)`);
  }

  async setOffline(userId: string) {
    try {
      await this.redis.del(`presence:${userId}`);
    } catch {}
    Logger.log(`setOffline event received for ${userId} (cleared Redis presence)`);
  }

  async isOnline(userId: string): Promise<boolean> {
    try {
      const count = await this.redis.scard(`presence:${userId}`);
      return count > 0;
    } catch {
      return false;
    }
  }

  // CREATE PROFILE
  async createProfile(data: userProfileDto) {
    // Guard: skip if userId is missing or empty
    if (!data.user_id || data.user_id.trim() === '') {
      Logger.warn('createProfile called with empty user_id — skipping');
      return null;
    }

    const existing = await this.profileRepo.findOneBy({
      user_id: data.user_id,
    });
    if (existing) return existing;

    const profile = this.profileRepo.create({
      user_id: data.user_id,
      bio: data.bio,
      profile_picture: data.profile_picture,
      phone_number: data.phone_number,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      country: data.country,
      state: data.state,
    });
    return await this.profileRepo.save(profile);
  }

  async getMe(userId: string) {
    const cached = await this.redis.get(`user:profile:${userId}`);
    if (cached) return JSON.parse(cached);

    const [profile, user] = await Promise.all([
      this.profileRepo.findOneBy({ user_id: userId }),
      this.userRepo.findOneBy({ id: userId }),
    ]);

    if (!user) throw new RpcException('User not found');

    // If profile doesn't exist yet (race condition with event handler), return minimal data
    const result = {
      userId,
      id: userId, // also include 'id' field for frontend compatibility
      name: user.name,
      email: user.email,
      role: user.role,
      bio: profile?.bio || '',
      profile_picture: profile?.profile_picture || '',
      phone_number: profile?.phone_number || '',
      date_of_birth: profile?.date_of_birth || null,
      gender: profile?.gender || '',
      country: profile?.country || '',
      state: profile?.state || '',
      isOnline: await this.isOnline(userId),
    };

    // Only cache if profile exists — otherwise profile creation might be in-flight
    if (profile) {
      await this.redis.set(
        `user:profile:${userId}`,
        JSON.stringify(result),
        'EX',
        PROFILE_CACHE_TTL,
      );
    }

    return result;
  }

  async updateMe(
    userId: string,
    dto: Partial<{
      bio: string;
      profile_picture: string;
      phone_number: string;
      date_of_birth: Date;
      gender: string;
      country: string;
      state: string;
    }>,
  ) {
    let profile = await this.profileRepo.findOneBy({ user_id: userId });
    
    // If profile doesn't exist yet, create it with the update data
    if (!profile) {
      profile = this.profileRepo.create({
        user_id: userId,
        bio: dto.bio || '',
        profile_picture: dto.profile_picture || '',
        phone_number: dto.phone_number || '',
        date_of_birth: dto.date_of_birth,
        gender: dto.gender || '',
        country: dto.country || '',
        state: dto.state || '',
      });
    } else {
      // Profile exists — update it
      Object.assign(profile, dto);
    }

    const saved = await this.profileRepo.save(profile);

    await this.redis.del(`user:profile:${userId}`);
    // this.events.emitProfileUpdated(userId, { profile_picture: dto.profile_picture });

    return saved;
  }

  async deleteMe(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    const profile = await this.profileRepo.findOneBy({ user_id: userId });

    if (!user && !profile) throw new RpcException('User not found');

    if (profile) await this.profileRepo.remove(profile);
    if (user) await this.userRepo.remove(user);

    // remove from MongoDB — delete their block list and remove them from others' block lists
    await this.blockedModel.deleteOne({ userId });
    await this.blockedModel.updateMany(
      { blocked_ids: userId },
      { $pull: { blocked_ids: userId } },
    );

    await this.redis.del(`user:profile:${userId}`);
    await this.redis.del(`presence:${userId}`);

    return { status: 'success', message: 'Account deleted successfully' };
  }

  async getUserById(viewerId: string, targetId: string) {
    // check if target has blocked the viewer
    const targetBlockDoc = await this.blockedModel.findOne({
      userId: targetId,
    });
    if (targetBlockDoc?.blocked_ids?.includes(viewerId)) {
      throw new RpcException('User not found');
    }

    const [profile, user] = await Promise.all([
      this.profileRepo.findOneBy({ user_id: targetId }),
      this.userRepo.findOneBy({ id: targetId }),
    ]);
    if (!profile) throw new RpcException('User not found');

    return {
      userId: targetId,
      id: targetId,
      name: user?.name,
      email: user?.email,
      bio: profile.bio,
      profile_picture: profile.profile_picture,
      phone_number: profile.phone_number,
      country: profile.country,
      state: profile.state,
      gender: profile.gender,
      date_of_birth: profile.date_of_birth,
      isOnline: await this.isOnline(targetId),
    };
  }

  async searchUsers(query: string, viewerId: string) {
    if (!query || query.trim() === '') return [];

    const blockedList = await this.getBlockedList(viewerId);
    const excludeIds = [viewerId, ...blockedList];

    // Search users by name or email, excluding admins and blocked users
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('(user.name ILIKE :query OR user.email ILIKE :query)', { query: `%${query}%` })
      .andWhere('user.id NOT IN (:...excludeIds)', { excludeIds })
      .andWhere("user.role = 'user'")  // Only show regular users
      .take(10)
      .getMany();

    // Fetch profiles
    const results = await Promise.all(
      users.map(async (user) => {
        const profile = await this.profileRepo.findOneBy({ user_id: user.id });
        return {
          id: user.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          profile_picture: profile?.profile_picture,
          isOnline: await this.isOnline(user.id),
        };
      })
    );
    return results;
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId)
      throw new RpcException('Cannot block yourself');

    // $addToSet is atomic - Agent Advice
    await this.blockedModel.findOneAndUpdate(
      { userId: blockerId },
      { $addToSet: { blocked_ids: blockedId } },
      { upsert: true, new: true },
    );

    return { status: 'success', message: 'User blocked' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const doc = await this.blockedModel.findOne({ userId: blockerId });
    if (!doc || !doc.blocked_ids.includes(blockedId)) {
      throw new RpcException('User is not blocked');
    }

    await this.blockedModel.findOneAndUpdate(
      { userId: blockerId },
      { $pull: { blocked_ids: blockedId } },
    );

    return { status: 'success', message: 'User unblocked' };
  }

  async getBlockedList(userId: string): Promise<string[]> {
    const myBlockDoc = await this.blockedModel.findOne({ userId });
    const myBlocked = myBlockDoc?.blocked_ids || [];

    const whoBlockedMeDocs = await this.blockedModel.find({ blocked_ids: userId });
    const whoBlockedMe = whoBlockedMeDocs.map((d) => d.userId);

    return Array.from(new Set([...myBlocked, ...whoBlockedMe]));
  }

  // ─── ADMIN: GET ALL USERS ─────────────────────────────────────────────────

  async getAllUsers(excludeUserId?: string) {
    const queryBuilder = this.userRepo.createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.createdAt'])
      .orderBy('user.createdAt', 'DESC');
    
    // Exclude the current admin from the list
    if (excludeUserId) {
      queryBuilder.where('user.id != :excludeUserId', { excludeUserId });
    }
    
    const users = await queryBuilder.getMany();
    
    // Return array directly, not wrapped
    return users;
  }

    async adminDeleteUser(targetId: string) {
      const user = await this.userRepo.findOneBy({ id: targetId });
      if (!user) throw new RpcException('User not found');

      const profile = await this.profileRepo.findOneBy({ user_id: targetId });
      if (profile) await this.profileRepo.remove(profile);
      await this.userRepo.remove(user);

      // clean up MongoDB
      await this.blockedModel.deleteOne({ userId: targetId });
      await this.blockedModel.updateMany(
        { blocked_ids: targetId },
        { $pull: { blocked_ids: targetId } },
      );

      await this.redis.del(`user:profile:${targetId}`);
      await this.redis.del(`presence:${targetId}`);

      // this.events.emitUserDeleted(targetId);
      return { status: 'success', message: 'User deleted by admin' };
    }

    // ─── ADMIN: CHANGE ROLE ───────────────────────────────────────────────────

    async changeUserRole(targetId: string, newRole: UserRole) {
      const user = await this.userRepo.findOneBy({ id: targetId });
      if (!user) throw new RpcException('User not found');

      user.role = newRole;
      await this.userRepo.save(user);
      await this.redis.del(`user:profile:${targetId}`);

      // this.events.emitRoleChanged(targetId, newRole);
      return { status: 'success', message: `Role updated to ${newRole}` };
    }
}
