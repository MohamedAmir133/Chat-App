import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';
import * as cookie from 'cookie';
// @WebSocketGateway(3002, {
//       origin: ['http://localhost:3400', 'http://localhost:3300', 'http://localhost:3000'],
// })
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly presenceService: PresenceService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Socket attempting connection: ${client.id}`);
    try {
      // 1. Extract cookies
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) {
        this.logger.warn(`[${client.id}] No cookie header — disconnecting`);
        client.disconnect();
        return;
      }

      // 2. Parse jwt cookie
      const parsedCookies = cookie.parse(cookieHeader);
      const token = parsedCookies['jwt'];
      if (!token) {
        this.logger.warn(`[${client.id}] No jwt cookie found — disconnecting`);
        client.disconnect();
        return;
      }

      // 3. Verify token
      const userId = await this.presenceService.verifyTokenAndGetUserId(token);
      if (!userId) {
        this.logger.warn(`[${client.id}] Token invalid — disconnecting`);
        client.disconnect();
        return;
      }

      this.logger.log(`[${client.id}] Authenticated as userId=${userId}`);

      // 4. Track presence
      client.data.userId = userId;
      // Each user joins their personal room — used for targeted broadcasts
      client.join(`user:${userId}`);

      const isFirstConnection = await this.presenceService.userConnected(
        userId,
        client.id,
      );
      this.logger.log(
        `[${client.id}] userConnected — isFirst=${isFirstConnection}`,
      );

      if (isFirstConnection) {
        // Broadcast to ALL connected clients
        this.server.emit('user_status_changed', { userId, status: 'online' });
        this.logger.log(
          `[Broadcast] user_status_changed: userId=${userId} online`,
        );
      }

      // 5. Send presence snapshot to this client only (exclude self)
      const allOnlineUserIds = await this.presenceService.getAllOnlineUserIds();
      const onlineUserIds = allOnlineUserIds.filter((id) => id !== userId);
      this.logger.log(
        `[${client.id}] Sending presence_snapshot to userId=${userId}: [${onlineUserIds.join(', ')}]`,
      );
      client.emit('presence_snapshot', { onlineUserIds });
    } catch (error) {
      this.logger.error(`handleConnection error: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const isLastConnection = await this.presenceService.userDisconnected(
      userId,
      client.id,
    );
    this.logger.log(
      `[${client.id}] disconnected userId=${userId} — isLast=${isLastConnection}`,
    );

    if (isLastConnection) {
      // Broadcast to ALL clients using server.emit (client.broadcast.emit fails on disconnected socket)
      this.server.emit('user_status_changed', {
        userId,
        status: 'offline',
        lastSeen: new Date(),
      });
      this.logger.log(
        `[Broadcast] user_status_changed: userId=${userId} offline`,
      );
    }
  }

  // ─── Real-time Typing Indicators ───────────────────────────────────────────

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; roomId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.recipientId) return;

    this.logger.log(
      `[Typing] user:${userId} started typing to user:${data.recipientId}`,
    );
    this.server.to(`user:${data.recipientId}`).emit('user_typing', {
      userId,
      roomId: data.roomId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; roomId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.recipientId) return;

    this.logger.log(
      `[Typing] user:${userId} stopped typing to user:${data.recipientId}`,
    );
    this.server.to(`user:${data.recipientId}`).emit('user_typing', {
      userId,
      roomId: data.roomId,
      isTyping: false,
    });
  }

  // ─── Read Receipts ──────────────────────────────────────────────────────────

  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; roomId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.recipientId) return;

    this.logger.log(
      `[ReadReceipt] user:${userId} marked messages read from user:${data.recipientId}`,
    );
    this.server.to(`user:${data.recipientId}`).emit('messages_read', {
      userId,
      roomId: data.roomId,
    });
  }

  // ─── Group Room Management ──────────────────────────────────────────────────

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.roomId) return;

    client.join(`room:${data.roomId}`);
    this.logger.log(`[${client.id}] User ${userId} joined room:${data.roomId}`);
    
    client.emit('room_joined', { roomId: data.roomId });
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.roomId) return;

    client.leave(`room:${data.roomId}`);
    this.logger.log(`[${client.id}] User ${userId} left room:${data.roomId}`);
    
    client.emit('room_left', { roomId: data.roomId });
  }
}
