import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from './entities/user.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { RoomEntity } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';

dotenv.config();

const entities = [UserEntity, UserProfileEntity, RoomEntity, RoomMember];

// Railway provides DATABASE_URL — parse it if available, otherwise use individual vars
function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
    };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chatapp',
    ssl:
      process.env.DB_SSL === 'true' || isProduction
        ? { rejectUnauthorized: false }
        : false,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDbConfig(),
      entities: entities,
      // synchronize: true ensures tables are created on first deploy.
      // Set DISABLE_SYNC=true in Railway env once tables exist.
      synchronize: process.env.DISABLE_SYNC !== 'true',
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

