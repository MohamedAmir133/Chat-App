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

function cleanEnv(val?: string, fallback = ''): string {
  return (val || fallback).replace(/^["']+|["']+$/g, '').trim();
}

function getMongoUri(): string {
  // Check multiple common MongoDB environment variable names
  const mongoUri = 
    cleanEnv(process.env.MONGO_URI) ||
    cleanEnv(process.env.MONGODB_URI) ||
    cleanEnv(process.env.MONGODB_URL) ||
    cleanEnv(process.env.MONGO_URL) ||
    'mongodb://localhost:27017/chatapp';
  
  // Validate the URI format
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error(`❌ Invalid MongoDB URI format: ${mongoUri}`);
    console.error('Expected format: mongodb://... or mongodb+srv://...');
    throw new Error('Invalid MongoDB connection string format');
  }
  
  console.log(`✅ Using MongoDB URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  return mongoUri;
}

@Module({
  imports: [
    // PostgreSQL for Rooms & Members
    DatabaseModule,
    TypeOrmModule.forFeature([RoomEntity, RoomMember, UserEntity, UserProfileEntity]),

    // MongoDB for Messages
    MongooseModule.forRoot(getMongoUri()),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),

    // RabbitMQ Clients
    ClientsModule.register([
      {
        name: 'Chat_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            cleanEnv(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672'),
          ],
          queue: cleanEnv(process.env.CHAT_QUEUE, 'chat_queue'),
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
