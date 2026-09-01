import { IsDate, IsOptional, IsString } from 'class-validator';
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

  @IsString()
  type?: RoomType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  createdAt?: Date;
  
  @IsOptional()
  @IsDate()
  updatedAt?: Date;
  
  @IsOptional()
  @IsDate()
  deletedAt?: Date;
}
