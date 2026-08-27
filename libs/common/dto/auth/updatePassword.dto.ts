import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/*eslint-disable*/
export class UpdatePasswordDTO {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  confirmNewPassword!: string;
}