/*eslint-disable*/
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { Request } from 'express';
import { AuthGuard } from 'libs/Guards';
import { RoomType, roomMemberDto, messageDto } from '@libs/database';
import { roomDto } from '@libs/common/dto/rooms/room.dto';

@Controller('rooms')
export class ChatHttpController {
  constructor(
    @Inject('CHAT_Client')
    private readonly chatClient: ClientProxy,
  ) {}

  // POST /rooms/direct — Create a 1-on-1 room between two users
  @UseGuards(AuthGuard)
  @Post('/direct')
  async createDirectRoom(
    @Body() body: { targetUserId: string },
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const dto: roomDto = {
        owner_id: userId,
        name: `dm_${userId}_${body.targetUserId}`,
        type: RoomType.ONE_ONE,
      };
      const result = await firstValueFrom(
        this.chatClient.send('createRoom', dto),
      );

      // Also join the target user
      if (body.targetUserId) {
        await firstValueFrom(
          this.chatClient.send('joinRoom', {
            userId: body.targetUserId,
            roomId: result.room.id,
            role: 'member',
          }),
        );
      }

      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // GET /rooms — get all rooms the authenticated user belongs to
  @UseGuards(AuthGuard)
  @Get('/')
  async getMyRooms(@Req() req: Request) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('getUserRooms', {
          userId: (req.user as any).id,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // GET /rooms/:roomId — get a single room (must be a member)
  @UseGuards(AuthGuard)
  @Get('/:roomId')
  async getRoomById(@Req() req: Request, @Param('roomId') roomId: string) {
    try {
      const userId = (req.user as any).id;
      const result = await firstValueFrom(
        this.chatClient.send('getRoomById', { userId, roomId }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // GET /rooms/:roomId/messages — get messages in a room
  @UseGuards(AuthGuard)
  @Get('/:roomId/messages')
  async getRoomMessages(@Req() req: Request, @Param('roomId') roomId: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('getRoomMessages', {
          userId: (req.user as any).id,
          roomId,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // POST /rooms/:roomId/messages — send a message
  @UseGuards(AuthGuard)
  @Post('/:roomId/messages')
  async sendMessage(
    @Body() body: { content: string; fileUrl?: string; messageType?: string },
    @Param('roomId') roomId: string,
    @Req() req: Request,
  ) {
    try {
      const senderId = (req.user as any).id;
      const dto: messageDto = {
        chatRoomId: roomId,
        senderId,
        content: body.content,
        fileUrl: body.fileUrl,
        messageType: body.messageType as any,
      };
      const result = await firstValueFrom(
        this.chatClient.send('createMessage', dto),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // POST /rooms/:roomId/join — join an existing room
  @UseGuards(AuthGuard)
  @Post('/:roomId/join')
  async joinRoom(@Req() req: Request, @Param('roomId') roomId: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('joinRoom', {
          userId: (req.user as any).id,
          roomId,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // DELETE /rooms/:roomId/leave — leave a room
  @UseGuards(AuthGuard)
  @Delete('/:roomId/leave')
  async leaveRoom(@Req() req: Request, @Param('roomId') roomId: string) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('leaveRoom', {
          userId: (req.user as any).id,
          roomId,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
}
