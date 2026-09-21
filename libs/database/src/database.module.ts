import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from './entities/user.entity';
import { UserProfileEntity } from './entities/user-profile.entity';
import { RoomEntity } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';

dotenv.config();

const entities = [UserEntity, UserProfileEntity, RoomEntity, RoomMember];

function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !process.env.DB_HOST) {
    return {
      url: databaseUrl,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chatapp',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...getDbConfig(),
      entities: entities,
      // Local Docker development creates the schema automatically.
      synchronize: process.env.DISABLE_SYNC !== 'true',
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
