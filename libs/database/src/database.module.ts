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
      // synchronize: true ensures tables are created on first deploy.
      // Set DISABLE_SYNC=true in Railway env once migrations are in place.
      synchronize: process.env.DISABLE_SYNC !== 'true',
      // Enable SSL for cloud databases (Supabase, Railway Postgres, Neon, AWS RDS)
      ssl:
        process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
