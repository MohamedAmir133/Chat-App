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

@Module({
  imports: [
    // PostgreSQL
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity, UserProfileEntity]),

    // MongoDB for blocked users
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp',
    ),
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
        new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        }),
    },
  ],
})
export class UserModule {}
