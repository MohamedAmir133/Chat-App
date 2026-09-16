import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from './entities/user.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { RoomEntity } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';

dotenv.config();

const entities = [UserEntity, UserProfileEntity, RoomEntity, RoomMember];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'chatapp',
      entities: entities,
      // In dev: true auto-creates tables. In production: migrations should manage schema to avoid data loss
      synchronize: process.env.NODE_ENV !== 'production',
      // PRODUCTION: Enable SSL for cloud databases (AWS RDS, Supabase, Neon)
      // ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
