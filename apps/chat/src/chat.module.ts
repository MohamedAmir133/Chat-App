import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import {
  DatabaseModule,
  RoomEntity,
  RoomMember,
  UserEntity,
  UserProfileEntity,
  Message,
  MessageSchema,
} from '@libs/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    // PostgreSQL for Rooms & Members
    DatabaseModule,
    TypeOrmModule.forFeature([RoomEntity, RoomMember, UserEntity, UserProfileEntity]),

    // MongoDB for Messages
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp',
    ),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),

    // RabbitMQ Clients
    ClientsModule.register([
      {
        name: 'Chat_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.CHAT_QUEUE || 'chat_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    // Redis client for caching active chats / presence
    {
      provide: 'REDIS_CLIENT',
      useFactory: () =>
        process.env.REDIS_URL
          ? new Redis(process.env.REDIS_URL, {
              tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
            })
          : new Redis({
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
              password: process.env.REDIS_PASSWORD || undefined,
              tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
            }),
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
