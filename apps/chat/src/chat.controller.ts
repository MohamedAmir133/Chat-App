import { Controller } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { roomDto, roomMemberDto, messageDto } from '@libs/database';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @MessagePattern('createRoom')
  async createRoom(@Payload() dto: roomDto) {
    return await this.chatService.createRoom(dto);
  }

  @MessagePattern('createRoomMember')
  async createRoomMember(@Payload() dto: roomMemberDto) {
    return await this.chatService.joinRoom(dto);
  }

  @MessagePattern('joinRoom')
  async joinRoom(@Payload() dto: roomMemberDto) {
    return await this.chatService.joinRoom(dto);
  }

  @MessagePattern('leaveRoom')
  async leaveRoom(@Payload() dto: { userId: string; roomId: string }) {
    return await this.chatService.leaveRoom(dto);
  }

  @MessagePattern('createMessage')
  async createMessage(@Payload() dto: messageDto) {
    return await this.chatService.sendMessage(dto);
  }

  @MessagePattern('sendMessage')
  async sendMessage(@Payload() dto: messageDto) {
    return await this.chatService.sendMessage(dto);
  }

  @MessagePattern('getRoomMessages')
  async getRoomMessages(@Payload() data: { roomId: string; userId: string }) {
    return await this.chatService.getRoomMessages(data);
  }

  @MessagePattern('getUserRooms')
  async getUserRooms(@Payload() data: { userId: string }) {
    return await this.chatService.getUserRooms(data.userId);
  }

  @MessagePattern('getRoomById')
  async getRoomById(@Payload() data: { roomId: string; userId: string }) {
    return await this.chatService.getRoomById(data.roomId, data.userId);
  }

  @MessagePattern('findDirectRoom')
  async findDirectRoom(
    @Payload() data: { userId: string; targetUserId: string },
  ) {
    return await this.chatService.findDirectRoom(
      data.userId,
      data.targetUserId,
    );
  }

  // ─── Message Management ──────────────────────────────────────────────────

  @MessagePattern('editMessage')
  async editMessage(
    @Payload() data: { messageId: string; userId: string; newContent: string },
  ) {
    return await this.chatService.editMessage(data);
  }

  @MessagePattern('deleteMessage')
  async deleteMessage(
    @Payload() data: { messageId: string; userId: string; isAdmin?: boolean },
  ) {
    return await this.chatService.deleteMessage(data);
  }

  @MessagePattern('reallyDeleteMessage')
  async trueDeleteMessage(
    @Payload() data: { messageId: string; userId: string; isAdmin?: boolean },
  ) {
    return await this.chatService.reallyDeleteMessage(data);
  }

  // ─── Group Management ────────────────────────────────────────────────────

  @MessagePattern('updateGroupInfo')
  async updateGroupInfo(
    @Payload()
    data: {
      roomId: string;
      userId: string;
      name?: string;
      description?: string;
      group_picture?: string;
    },
  ) {
    return await this.chatService.updateGroupInfo(data);
  }

  @MessagePattern('removeMember')
  async removeMember(
    @Payload() data: { roomId: string; ownerId: string; targetUserId: string },
  ) {
    return await this.chatService.removeMember(data);
  }

  // ─── Admin Operations ────────────────────────────────────────────────────

  @MessagePattern('admin.getAllRooms')
  async adminGetAllRooms() {
    return await this.chatService.getAllRooms();
  }

  @MessagePattern('admin.getAllMessages')
  async adminGetAllMessages(@Payload() data: { roomId?: string }) {
    return await this.chatService.getAllMessages(data.roomId);
  }

  @MessagePattern('admin.deleteRoom')
  async adminDeleteRoom(@Payload() data: { roomId: string }) {
    return await this.chatService.adminDeleteRoom(data.roomId);
  }
}
