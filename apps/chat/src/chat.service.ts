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
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  // ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────

  async createRoom(dto: roomDto) {
    const { owner_id, name, type, description } = dto;

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
    // Find all memberships for this user
    const memberships = await this.memberRepo.findBy({ userId });
    if (!memberships || memberships.length === 0) {
      return [];
    }

    const roomIds = memberships.map((m) => m.roomId);
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .where('room.id IN (:...roomIds)', { roomIds })
      .getMany();

    // Attach latest message from MongoDB for each room and fetch members
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await this.messageModel
          .findOne({ chatRoomId: room.id })
          .sort({ createdAt: -1 })
          .exec();

        const members = await this.memberRepo.findBy({ roomId: room.id });
        
        // Also fetch user details for each member from the User service? 
        // We can just return the memberIds for now, but to get names we'd need to fetch them.
        // Actually, let's just fetch the UserEntity for each member right here since ChatService has UserEntity injected!
        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const userDoc = await this.userRepo.findOneBy({ id: m.userId });
            // Get profile from Redis or emit to User service if needed, but we have userRepo here
            return {
              ...m,
              name: userDoc?.name || 'Unknown User',
              email: userDoc?.email || '',
            };
          })
        );

        return {
          ...room,
          lastMessage,
          memberCount: members.length,
          members: memberDetails,
        };
      }),
    );

    return roomsWithDetails;
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
    return {
      room,
      members,
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
      .find({ chatRoomId: roomId, isDeleted: false })
      .sort({ createdAt: 1 })
      .exec();
    return {
      messages,
    };
  }
}
