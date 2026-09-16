import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
/* eslint-disable*/
enum RoomType {
  ONE_ONE = 'one_one',
  GROUP = 'group',
}
export class roomDto {
  @IsString()
  owner_id: string;

  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDate()
  createdAt?: Date;
  
  @IsDate()
  updatedAt?: Date;
  
  @IsOptional()
  @IsDate()
  deletedAt?: Date;
}
