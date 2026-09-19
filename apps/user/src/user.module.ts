import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DatabaseModule, UserEntity, UserProfileEntity } from '@libs/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedUser, BlockedUserSchema } from '@libs/database';
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
    // PostgreSQL
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity, UserProfileEntity]),

    // MongoDB for blocked users
    MongooseModule.forRoot(getMongoUri()),
    MongooseModule.forFeature([
      { name: BlockedUser.name, schema: BlockedUserSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // Redis client
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
})
export class UserModule {}
