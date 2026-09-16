import { IsDate, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
/* eslint-disable*/
export class userProfileDto {
  @IsString()
  user_id!: string;
  @IsOptional()
  @IsString()
  bio?: string;
  
  @IsOptional()
  @IsString()
  profile_picture?: string;
  
  @IsOptional()
  @IsPhoneNumber()
  phone_number?: string;

  @IsOptional()
  @IsDate()
  date_of_birth?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}
