import { IsDate, IsPhoneNumber, IsString } from 'class-validator';
/* eslint-disable*/
export class userProfileDto {
  @IsString()
  user_id!: string;
  @IsString()
  bio?: string;
  @IsString()
  profile_picture?: string;
  @IsPhoneNumber()
  phone_number?: string;

  @IsDate()
  date_of_birth?: Date;

  @IsString()
  gender?: string;

  @IsString()
  country?: string;

  @IsString()
  state?: string;

  @IsDate()
  createdAt?: Date;

  @IsDate()
  updatedAt?: Date;
}
