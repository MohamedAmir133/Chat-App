import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import {
  RoomEntity,
  RoomMember,
  UserEntity,
  UserProfileEntity,
  RoomType,
  UserRoomRole,
  Message,
  MessageDocument,
  roomDto,
  roomMemberDto,
  messageDto,
} from '@libs/database';
import Redis from 'ioredis';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomRepo: Repository<RoomEntity>,
    @InjectRepository(RoomMember)
    private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly profileRepo: Repository<UserProfileEntity>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  // ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────

  async createRoom(dto: roomDto & { memberIds?: string[] }) {
    const { owner_id, name, type, description, memberIds } = dto;

    const roomType = (type as RoomType) || RoomType.ONE_ONE;

    // Create room record in PostgreSQL
    const room = this.roomRepo.create({
      name: name || undefined,
      type: roomType,
      owner_id: owner_id,
      description: description || undefined,
    });

    const savedRoom = await this.roomRepo.save(room);

    const ownerMember = this.memberRepo.create({
      roomId: savedRoom.id,
      userId: owner_id,
      role: UserRoomRole.OWNER,
    });
    await this.memberRepo.save(ownerMember);

    // Add extra members if provided (for group creation)
    if (memberIds && memberIds.length > 0) {
      const extraMembers = memberIds
        .filter((id) => id && id !== owner_id) // skip nulls and owner (already added)
        .map((memberId) =>
          this.memberRepo.create({
            roomId: savedRoom.id,
            userId: memberId,
            role: UserRoomRole.MEMBER,
          }),
        );
      if (extraMembers.length > 0) {
        await this.memberRepo.save(extraMembers);
      }
    }

    this.logger.log(`Room created: ${savedRoom.id} by user: ${owner_id}`);

    return {
      status: 'success',
      room: savedRoom,
      membership: ownerMember,
    };
  }

  async joinRoom(dto: roomMemberDto) {
    const { userId, roomId, role } = dto;

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    // Check if user is already a member
    const existing = await this.memberRepo.findOneBy({ roomId, userId });
    if (existing) {
      return {
        status: 'success',
        message: 'User already in room',
        membership: existing,
      };
    }

    const memberRole = (role as UserRoomRole) || UserRoomRole.MEMBER;
    const member = this.memberRepo.create({
      roomId,
      userId,
      role: memberRole,
    });

    const savedMember = await this.memberRepo.save(member);
    this.logger.log(`User ${userId} joined room ${roomId} as ${memberRole}`);

    return {
      status: 'success',
      message: 'Joined room successfully',
      membership: savedMember,
    };
  }

  async leaveRoom(dto: { userId: string; roomId: string }) {
    const { userId, roomId } = dto;

    const member = await this.memberRepo.findOneBy({ roomId, userId });
    if (!member) {
      throw new RpcException('Membership not found');
    }

    await this.memberRepo.remove(member);
    this.logger.log(`User ${userId} left room ${roomId}`);

    return {
      status: 'success',
      message: 'Left room successfully',
    };
  }

  async getUserRooms(userId: string) {
    console.log(`[getUserRooms] Starting for userId: ${userId}`);
    
    // Find all memberships for this user
    console.log(`[getUserRooms] Fetching memberships...`);
    const memberships = await this.memberRepo.findBy({ userId });
    console.log(`[getUserRooms] Found ${memberships?.length || 0} memberships`);
    
    if (!memberships || memberships.length === 0) {
      console.log(`[getUserRooms] No memberships found, returning empty array`);
      return [];
    }

    const roomIds = memberships.map((m) => m.roomId);
    console.log(`[getUserRooms] Fetching ${roomIds.length} rooms...`);
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .where('room.id IN (:...roomIds)', { roomIds })
      .getMany();
    console.log(`[getUserRooms] Found ${rooms.length} rooms`);

    // Attach latest message from MongoDB for each room and fetch members
    console.log(`[getUserRooms] Fetching details for each room...`);
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await this.messageModel
          .findOne({ chatRoomId: room.id })
          .sort({ createdAt: -1 })
          .exec();

        const members = await this.memberRepo.findBy({ roomId: room.id });

        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const userDoc = await this.userRepo.findOneBy({ id: m.userId });
            const profileDoc = await this.profileRepo.findOneBy({
              user_id: m.userId,
            });
            return {
              ...m,
              name: userDoc?.name || 'Unknown User',
              email: userDoc?.email || '',
              profile_picture: profileDoc?.profile_picture || null,
              bio: profileDoc?.bio || null,
              phone_number: profileDoc?.phone_number || null,
            };
          }),
        );

        // Mark self-rooms so the frontend can display them as "Saved Messages"
        const isSelfRoom =
          members.length > 0 && members.every((m) => m.userId === userId);

        return {
          ...room,
          lastMessage,
          memberCount: members.length,
          members: memberDetails,
          isSelfRoom,
        };
      }),
    );

    console.log(`[getUserRooms] Completed, returning ${roomsWithDetails.length} rooms with details`);
    return roomsWithDetails;
  }

  /**
   * Find an existing direct room between two users (or a self-room when userId === targetUserId),
   * or return null if none exists. Prevents duplicate DM rooms.
   */
  async findDirectRoom(
    userId: string,
    targetUserId: string,
  ): Promise<string | null> {
    const isSelf = userId === targetUserId;

    const myMemberships = await this.memberRepo.findBy({ userId });
    for (const mem of myMemberships) {
      const roomMembers = await this.memberRepo.findBy({ roomId: mem.roomId });
      if (isSelf) {
        // Self-room: only one distinct member (the user themselves)
        const uniqueIds = new Set(roomMembers.map((m) => m.userId));
        if (uniqueIds.size === 1 && uniqueIds.has(userId)) {
          return mem.roomId;
        }
      } else {
        // Normal DM: exactly two distinct members
        const memberIds = roomMembers.map((m) => m.userId);
        if (
          memberIds.length === 2 &&
          memberIds.includes(userId) &&
          memberIds.includes(targetUserId)
        ) {
          return mem.roomId;
        }
      }
    }
    return null;
  }

  async getRoomById(roomId: string, userId: string) {
    const isMember = await this.memberRepo.findOneBy({ roomId, userId });
    if (!isMember) {
      throw new RpcException('You are not a member of this room');
    }

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    const members = await this.memberRepo.findBy({ roomId });
    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const userDoc = await this.userRepo.findOneBy({ id: m.userId });
        const profileDoc = await this.profileRepo.findOneBy({
          user_id: m.userId,
        });
        return {
          ...m,
          name: userDoc?.name || 'Unknown User',
          email: userDoc?.email || '',
          profile_picture: profileDoc?.profile_picture || null,
          bio: profileDoc?.bio || null,
          phone_number: profileDoc?.phone_number || null,
        };
      }),
    );
    return {
      room,
      members: memberDetails,
    };
  }

  // ─── MESSAGING (MongoDB) ──────────────────────────────────────────────────

  async sendMessage(dto: messageDto) {
    const { chatRoomId, senderId, content, fileUrl, messageType } = dto;

    // Verify room existence
    const room = await this.roomRepo.findOneBy({ id: chatRoomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    // Verify membership
    const membership = await this.memberRepo.findOneBy({
      roomId: chatRoomId,
      userId: senderId,
    });
    if (!membership) {
      throw new RpcException('Sender is not a member of this room');
    }

    // Save message to MongoDB
    const message = new this.messageModel({
      chatRoomId,
      senderId,
      content,
      fileUrl,
      messageType: messageType || 'text',
      createdAt: new Date(),
    });

    const savedMessage = await message.save();
    this.logger.log(`Message sent in room ${chatRoomId} by ${senderId}`);

    return savedMessage;
  }

  async getRoomMessages(data: { roomId: string; userId: string }) {
    const { roomId, userId } = data;
    const isMember = await this.memberRepo.findOneBy({ roomId, userId });
    if (!isMember) {
      throw new RpcException('You are not a member of this room');
    }

    const messages = await this.messageModel
      .find({ chatRoomId: roomId })
      .sort({ createdAt: 1 })
      .exec();
    return {
      messages,
    };
  }

  // ─── MESSAGE MANAGEMENT ───────────────────────────────────────────────────

  async editMessage(data: {
    messageId: string;
    userId: string;
    newContent: string;
  }) {
    const { messageId, userId, newContent } = data;

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new RpcException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new RpcException('You can only edit your own messages');
    }

    if (message.isDeleted) {
      throw new RpcException('Cannot edit a deleted message');
    }

    message.content = newContent;
    message.isEdited = true;
    await message.save();

    this.logger.log(`Message ${messageId} edited by user ${userId}`);
    return message;
  }

  async deleteMessage(data: {
    messageId: string;
    userId: string;
    isAdmin?: boolean;
  }) {
    const { messageId, userId, isAdmin } = data;

    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new RpcException('Message not found');
    }

    // Allow deletion if: user is the sender OR user is admin
    if (message.senderId !== userId && !isAdmin) {
      throw new RpcException('You can only delete your own messages');
    }

    message.isDeleted = true;
    // Note: keep original content in DB so admin can view it
    await message.save();

    this.logger.log(`Message ${messageId} deleted by user ${userId}`);
    return message;
  }

  // ─── GROUP MANAGEMENT ─────────────────────────────────────────────────────

  async updateGroupInfo(data: {
    roomId: string;
    userId: string;
    name?: string;
    description?: string;
    group_picture?: string;
  }) {
    const { roomId, userId, name, description, group_picture } = data;

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    if (room.type !== RoomType.GROUP) {
      throw new RpcException('This is not a group room');
    }

    // Only owner can update group info
    const membership = await this.memberRepo.findOneBy({ roomId, userId });
    if (!membership || membership.role !== UserRoomRole.OWNER) {
      throw new RpcException('Only group owner can update group info');
    }

    if (name !== undefined) room.name = name;
    if (description !== undefined) room.description = description;
    if (group_picture !== undefined) room.group_picture = group_picture;

    const updated = await this.roomRepo.save(room);
    this.logger.log(`Group ${roomId} updated by owner ${userId}`);
    return updated;
  }

  async removeMember(data: {
    roomId: string;
    ownerId: string;
    targetUserId: string;
  }) {
    const { roomId, ownerId, targetUserId } = data;

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    if (room.type !== RoomType.GROUP) {
      throw new RpcException('Can only remove members from groups');
    }

    // Verify requester is the owner
    const ownerMembership = await this.memberRepo.findOneBy({
      roomId,
      userId: ownerId,
    });
    if (!ownerMembership || ownerMembership.role !== UserRoomRole.OWNER) {
      throw new RpcException('Only group owner can remove members');
    }

    // Cannot remove the owner themselves
    if (ownerId === targetUserId) {
      throw new RpcException('Owner cannot remove themselves');
    }

    const targetMembership = await this.memberRepo.findOneBy({
      roomId,
      userId: targetUserId,
    });
    if (!targetMembership) {
      throw new RpcException('Target user is not a member');
    }

    await this.memberRepo.remove(targetMembership);
    this.logger.log(
      `User ${targetUserId} removed from room ${roomId} by owner ${ownerId}`,
    );

    return {
      status: 'success',
      message: 'Member removed successfully',
    };
  }

  // ─── ADMIN OPERATIONS ─────────────────────────────────────────────────────

  async getAllRooms() {
    const rooms = await this.roomRepo.find();
    return rooms;
  }

  async getAllMessages(roomId?: string) {
    const query = roomId ? { chatRoomId: roomId } : {};
    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(1000)
      .exec();
    return messages;
  }
  async reallyDeleteMessage(data: { messageId: string; userId: string; isAdmin?: boolean }) {
    const { messageId, userId, isAdmin } = data;
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new RpcException('Message not found');
    }
    if (message.senderId !== userId && !isAdmin) {
      throw new RpcException('You are not authorized to delete this message');
    }
    await this.messageModel.deleteOne({ _id: messageId });
    this.logger.log(`User ${userId} permanently deleted message ${messageId} (isAdmin: ${!!isAdmin})`);
    return {
      status: 'success',
      message: 'Message permanently deleted successfully',
    };
  }

  async adminDeleteRoom(roomId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) {
      throw new RpcException('Room not found');
    }

    // Delete all memberships
    const members = await this.memberRepo.findBy({ roomId });
    await this.memberRepo.remove(members);

    // Delete all messages
    await this.messageModel.deleteMany({ chatRoomId: roomId });

    // Delete room
    await this.roomRepo.remove(room);

    this.logger.log(`Admin deleted room ${roomId}`);
    return { status: 'success', message: 'Room deleted' };
  }
}
