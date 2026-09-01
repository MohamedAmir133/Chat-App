import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRoomRole } from '@libs/database';

export class roomMemberDto {
  @IsString()
  userId: string;

  @IsString()
  roomId: string;

  @IsOptional()
  @IsEnum(UserRoomRole)
  role?: UserRoomRole;

  @IsOptional()
  @IsDate()
  joinedAt?: Date;
}
