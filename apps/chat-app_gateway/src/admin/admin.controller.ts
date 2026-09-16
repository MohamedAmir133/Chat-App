/*eslint-disable*/
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import type { Request } from 'express';
import { AuthGuard, RolesGuard, Roles } from 'libs/Guards';
import { UserRole } from '@libs/database';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @Inject('USER_Client')
    private readonly userClient: ClientProxy,
    @Inject('CHAT_Client')
    private readonly chatClient: ClientProxy,
  ) {}

  // ─── User Management ─────────────────────────────────────────────────────

  @Get('users')
  async getAllUsers(@Req() req: Request) {
    try {
      const currentUserId = (req.user as any).id;
      const result = await firstValueFrom(
        this.userClient.send('getAllUsers', { excludeUserId: currentUserId }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.userClient.send('adminDeleteUser', { targetId: id }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Put('users/:id/role')
  async changeUserRole(@Param('id') id: string, @Body() body: { newRole: UserRole }) {
    try {
      const result = await firstValueFrom(
        this.userClient.send('changeUserRole', { targetId: id, newRole: body.newRole }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // ─── Room/Group Management ───────────────────────────────────────────────

  @Get('rooms')
  async getAllRooms() {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('admin.getAllRooms', {}).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Delete('rooms/:id')
  async deleteRoom(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('admin.deleteRoom', { roomId: id }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // ─── Message Management ──────────────────────────────────────────────────

  @Get('messages')
  async getAllMessages() {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('admin.getAllMessages', {}).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Get('rooms/:roomId/messages')
  async getRoomMessages(@Param('roomId') roomId: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('admin.getAllMessages', { roomId }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('deleteMessage', { messageId: id, userId: 'admin', isAdmin: true }).pipe(timeout(10000)),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // ─── Statistics ──────────────────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    try {
      const [users, rooms, messages] = await Promise.all([
        firstValueFrom(this.userClient.send('getAllUsers', {}).pipe(timeout(10000))),
        firstValueFrom(this.chatClient.send('admin.getAllRooms', {}).pipe(timeout(10000))),
        firstValueFrom(this.chatClient.send('admin.getAllMessages', {}).pipe(timeout(10000))),
      ]);

      return {
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalRooms: Array.isArray(rooms) ? rooms.length : 0,
        totalMessages: Array.isArray(messages) ? messages.length : 0,
        timestamp: new Date(),
      };
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
}
