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
}
