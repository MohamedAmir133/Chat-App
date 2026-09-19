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
  Logger,
  Put,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import type { Request } from 'express';
import { AuthGuard, RolesGuard, Roles } from 'libs/Guards';
import { RoomType, roomMemberDto, messageDto, UserRole } from '@libs/database';
import { roomDto } from '@libs/common/dto/rooms/room.dto';
import { ChatGateway } from '@libs/sockets/socket.config';

@Controller('rooms')
export class ChatHttpController {
  private readonly logger = new Logger(ChatHttpController.name);

  constructor(
    @Inject('CHAT_Client')
    private readonly chatClient: ClientProxy,
    @Inject('USER_Client')
    private readonly userClient: ClientProxy,
    private readonly chatGateway: ChatGateway,
  ) {}

  // POST /rooms/direct — Find or create a 1-on-1 room (supports self-room)
  @UseGuards(AuthGuard)
  @Post('/direct')
  async createDirectRoom(
    @Body() body: { targetUserId: string },
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id;
      const targetUserId = body.targetUserId;
      const isSelf = userId === targetUserId;

      // Check if a room already exists between these two users
      const existingRoomId = await firstValueFrom(
        this.chatClient.send('findDirectRoom', { userId, targetUserId }),
      );

      if (existingRoomId) {
        // Room already exists — return it without creating a duplicate
        const existing = await firstValueFrom(
          this.chatClient.send('getRoomById', {
            userId,
            roomId: existingRoomId,
          }),
        );
        return { room: { id: existingRoomId, ...existing?.room } };
      }

      // Fetch user info for proper name formatting
      let ownerName = userId;
      let targetName = targetUserId;
      try {
        const ownerInfo = await firstValueFrom(
          this.userClient.send('getUserById', { userId }),
        );
        if (ownerInfo?.name) ownerName = ownerInfo.name;
      } catch {}

      if (!isSelf) {
        try {
          const targetInfo = await firstValueFrom(
            this.userClient.send('getUserById', { userId: targetUserId }),
          );
          if (targetInfo?.name) targetName = targetInfo.name;
        } catch {}
      }

      // Create the room
      const dto: roomDto = {
        owner_id: userId,
        name: isSelf
          ? `Own_${ownerName}_messages`
          : `${ownerName}_${targetName} Room`,
        type: RoomType.ONE_ONE,
      };
      const result = await firstValueFrom(
        this.chatClient.send('createRoom', dto),
      );

      // For normal DMs also join the target user; for self-rooms skip (creator is already a member)
      if (!isSelf && targetUserId) {
        await firstValueFrom(
          this.chatClient.send('joinRoom', {
            userId: targetUserId,
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
      const userId = (req.user as any).id;
      this.logger.log(`[getMyRooms] Fetching rooms for userId=${userId}`);
      
      const result = await firstValueFrom(
        this.chatClient.send('getUserRooms', {
          userId,
        }).pipe(timeout(30000)), // Increased timeout to 30 seconds
      );
      
      this.logger.log(`[getMyRooms] Successfully fetched ${result?.rooms?.length || 0} rooms for userId=${userId}`);
      return result;
    } catch (err) {
      this.logger.error(`[getMyRooms] Error fetching rooms: ${err?.message || err}`);
      this.logger.error(`[getMyRooms] Error stack: ${err?.stack}`);
      
      // Provide more helpful error message
      if (err?.message === 'Timeout has occurred') {
        throw new BadRequestException(
          'Chat service is not responding. Please check if the chat service is running and connected to RabbitMQ.',
        );
      }
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

      // Fetch room members so we can check blocking & notify recipients
      let memberUserIds: string[] = [];
      try {
        const roomData = await firstValueFrom(
          this.chatClient.send('getRoomById', { userId: senderId, roomId }),
        );
        memberUserIds = (roomData?.members ?? [])
          .map((m: any) => m.userId ?? m.id)
          .filter(Boolean);
      } catch {
        /* best-effort */
      }

      const recipientIds = memberUserIds.filter((uid) => uid !== senderId);

      // Check if any recipient has blocked sender or sender blocked recipient
      for (const recipientId of recipientIds) {
        try {
          const blockedList = await firstValueFrom(
            this.userClient.send('getBlockedUsers', { userId: senderId }),
          );
          if (Array.isArray(blockedList) && blockedList.includes(recipientId)) {
            throw new BadRequestException(
              'Cannot send message. Contact is blocked.',
            );
          }
        } catch (e: any) {
          if (e instanceof BadRequestException) throw e;
        }
      }

      const dto: messageDto = {
        chatRoomId: roomId,
        senderId,
        content: body.content,
        fileUrl: body.fileUrl,
        messageType: body.messageType as any,
      };
      const savedMessage = await firstValueFrom(
        this.chatClient.send('createMessage', dto),
      );

      const payload = {
        roomId,
        message: {
          id: savedMessage._id || savedMessage.id,
          senderId,
          content: body.content || '',
          fileUrl: savedMessage.fileUrl || body.fileUrl,
          messageType: savedMessage.messageType || body.messageType || 'text',
          createdAt: savedMessage.createdAt || new Date().toISOString(),
        },
      };

      this.logger.log(
        `[sendMessage] roomId=${roomId} sender=${senderId} members=${memberUserIds.join(',')} recipients=${recipientIds.join(',')}`,
      );

      // Broadcast to room channel excluding the sender (sender has optimistic update)
      this.chatGateway.server
        .to(`room:${roomId}`)
        .except(`user:${senderId}`)
        .emit('new_message', payload);

      // Also send to individual user channels as fallback for users not in room socket (excluding sender)
      recipientIds.forEach((uid) => {
        this.logger.log(`  → Emitting new_message to user:${uid}`);
        this.chatGateway.server.to(`user:${uid}`).emit('new_message', payload);
      });

      return savedMessage;
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

  // POST /rooms/:roomId/members — owner adds multiple members to an existing group
  @UseGuards(AuthGuard)
  @Post('/:roomId/members')
  async addMembers(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() body: { userIds: string[] },
  ) {
    try {
      const ownerId = (req.user as any).id;

      // Check if requester is owner by getting room details
      const roomData = await firstValueFrom(
        this.chatClient.send('getRoomById', { userId: ownerId, roomId }),
      );
      const membership = roomData?.members?.find(
        (m: any) => m.userId === ownerId || m.id === ownerId,
      );
      if (!membership || membership.role !== 'owner') {
        throw new BadRequestException('Only group owner can add members');
      }

      // Add each user
      const results: any[] = [];
      const addedUsers: string[] = [];
      for (const targetUserId of body.userIds || []) {
        try {
          const res = await firstValueFrom(
            this.chatClient.send('joinRoom', {
              userId: targetUserId,
              roomId,
              role: 'member',
            }),
          );
          results.push(res);
          addedUsers.push(targetUserId);
        } catch (e) {
          this.logger.warn(
            `Failed to add user ${targetUserId} to group ${roomId}: ${e}`,
          );
        }
      }

      // Emit member_added event to all existing group members including newly added
      if (addedUsers.length > 0) {
        // Get updated room data with all members
        const updatedRoomData = await firstValueFrom(
          this.chatClient.send('getRoomById', { userId: ownerId, roomId }),
        );

        const allMemberIds = (updatedRoomData?.members ?? [])
          .map((m: any) => m.userId ?? m.id)
          .filter(Boolean);

        // Fetch user details for the newly added members
        const addedMemberDetails = await Promise.all(
          addedUsers.map(async (userId) => {
            try {
              const userInfo = await firstValueFrom(
                this.userClient.send('getUserById', { userId }),
              );
              return {
                userId,
                name: userInfo?.name,
                email: userInfo?.email,
                profile_picture: userInfo?.profile?.profile_picture,
              };
            } catch {
              return { userId, name: 'Unknown User' };
            }
          }),
        );

        const eventPayload = {
          roomId,
          addedBy: ownerId,
          members: addedMemberDetails,
          room: updatedRoomData?.room,
        };

        // Broadcast to all members in the group
        allMemberIds.forEach((memberId: string) => {
          this.chatGateway.server
            .to(`user:${memberId}`)
            .emit('member_added', eventPayload);
        });

        // Also broadcast to room channel
        this.chatGateway.server
          .to(`room:${roomId}`)
          .emit('member_added', eventPayload);

        this.logger.log(
          `[addMembers] Emitted member_added event for room ${roomId}, added users: ${addedUsers.join(', ')}`,
        );
      }

      return { status: 'success', results };
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // DELETE /rooms/:roomId/leave — leave a room
  @UseGuards(AuthGuard)
  @Delete('/:roomId/leave')
  async leaveRoom(@Req() req: Request, @Param('roomId') roomId: string) {
    try {
      const userId = (req.user as any).id;

      // Get room data before leaving to notify other members
      let roomData;
      try {
        roomData = await firstValueFrom(
          this.chatClient.send('getRoomById', { userId, roomId }),
        );
      } catch {
        /* best-effort */
      }

      const result = await firstValueFrom(
        this.chatClient.send('leaveRoom', {
          userId,
          roomId,
        }),
      );

      // Emit member_removed event to remaining members
      if (roomData?.members) {
        const remainingMemberIds = roomData.members
          .map((m: any) => m.userId ?? m.id)
          .filter((id: string) => id !== userId);

        const eventPayload = {
          roomId,
          userId,
          removedBy: userId, // self-removal
        };

        // Notify remaining members
        remainingMemberIds.forEach((memberId: string) => {
          this.chatGateway.server
            .to(`user:${memberId}`)
            .emit('member_removed', eventPayload);
        });

        // Also broadcast to room channel
        this.chatGateway.server
          .to(`room:${roomId}`)
          .emit('member_removed', eventPayload);

        this.logger.log(
          `[leaveRoom] User ${userId} left room ${roomId}, notified ${remainingMemberIds.length} members`,
        );
      }

      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // PUT /rooms/:roomId/messages/:messageId — edit a message
  @UseGuards(AuthGuard)
  @Put('/:roomId/messages/:messageId')
  async editMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('editMessage', {
          messageId,
          userId: (req.user as any).id,
          newContent: body.content,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // DELETE /rooms/:roomId/messages/:messageId — delete a message
  @UseGuards(AuthGuard)
  @Delete('/:roomId/messages/:messageId')
  async deleteMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('deleteMessage', {
          messageId,
          userId: (req.user as any).id,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
  @UseGuards(AuthGuard)
  @Roles(UserRole.ADMIN)
  @Delete('/:roomId/messages/:messageId/really-delete')
  async reallyDeleteMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.chatClient.send('reallyDeleteMessage', {
          messageId,
          userId: (req.user as any).id,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
  // POST /rooms/group — create a group
  @UseGuards(AuthGuard)
  @Post('/group')
  async createGroup(
    @Req() req: Request,
    @Body() body: { name: string; description?: string; memberIds?: string[] },
  ) {
    try {
      const userId = (req.user as any).id;
      const dto: roomDto = {
        owner_id: userId,
        name: body.name,
        type: RoomType.GROUP,
        description: body.description,
      };

      // Create the room with members in one call
      const result = await firstValueFrom(
        this.chatClient.send('createRoom', {
          ...dto,
          memberIds: body.memberIds || [],
        }),
      );

      // Emit group_created event to all initial members
      if (result?.room?.id) {
        const roomId = result.room.id;
        const allMemberIds = [userId, ...(body.memberIds || [])].filter(
          Boolean,
        );

        const eventPayload = {
          roomId,
          room: result.room,
          createdBy: userId,
        };

        // Notify all initial members
        allMemberIds.forEach((memberId: string) => {
          this.chatGateway.server
            .to(`user:${memberId}`)
            .emit('group_created', eventPayload);
        });

        this.logger.log(
          `[createGroup] Created group ${roomId} with ${allMemberIds.length} members, emitted group_created event`,
        );
      }

      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // PUT /rooms/:roomId/info — update group info (owner only)
  @UseGuards(AuthGuard)
  @Put('/:roomId/info')
  async updateGroupInfo(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body()
    body: { name?: string; description?: string; group_picture?: string },
  ) {
    try {
      const userId = (req.user as any).id;

      const result = await firstValueFrom(
        this.chatClient.send('updateGroupInfo', {
          roomId,
          userId,
          name: body.name,
          description: body.description,
          group_picture: body.group_picture,
        }),
      );

      // Emit group_updated event to all group members
      try {
        const roomData = await firstValueFrom(
          this.chatClient.send('getRoomById', { userId, roomId }),
        );

        const memberIds = (roomData?.members ?? [])
          .map((m: any) => m.userId ?? m.id)
          .filter(Boolean);

        const eventPayload = {
          roomId,
          updatedBy: userId,
          updates: {
            name: body.name,
            description: body.description,
            group_picture: body.group_picture,
          },
          room: result,
        };

        // Broadcast to all members
        memberIds.forEach((memberId: string) => {
          this.chatGateway.server
            .to(`user:${memberId}`)
            .emit('group_updated', eventPayload);
        });

        // Also broadcast to room channel
        this.chatGateway.server
          .to(`room:${roomId}`)
          .emit('group_updated', eventPayload);

        this.logger.log(
          `[updateGroupInfo] Emitted group_updated event for room ${roomId} to ${memberIds.length} members`,
        );
      } catch (e) {
        this.logger.warn(`Failed to emit group_updated event: ${e}`);
      }

      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  // DELETE /rooms/:roomId/members/:userId — remove a member (owner only)
  @UseGuards(AuthGuard)
  @Delete('/:roomId/members/:targetUserId')
  async removeMember(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    try {
      const ownerId = (req.user as any).id;

      // Get room data before removal to notify members
      let roomData;
      try {
        roomData = await firstValueFrom(
          this.chatClient.send('getRoomById', { userId: ownerId, roomId }),
        );
      } catch {
        /* best-effort */
      }

      const result = await firstValueFrom(
        this.chatClient.send('removeMember', {
          roomId,
          ownerId,
          targetUserId,
        }),
      );

      // Emit member_removed event to all group members including the removed one
      if (roomData?.members) {
        const allMemberIds = roomData.members
          .map((m: any) => m.userId ?? m.id)
          .filter(Boolean);

        const eventPayload = {
          roomId,
          userId: targetUserId,
          removedBy: ownerId,
        };

        // Notify all members (including the removed one so they know)
        allMemberIds.forEach((memberId: string) => {
          this.chatGateway.server
            .to(`user:${memberId}`)
            .emit('member_removed', eventPayload);
        });

        // Also broadcast to room channel
        this.chatGateway.server
          .to(`room:${roomId}`)
          .emit('member_removed', eventPayload);

        this.logger.log(
          `[removeMember] Owner ${ownerId} removed ${targetUserId} from room ${roomId}, notified ${allMemberIds.length} members`,
        );
      }

      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
}
