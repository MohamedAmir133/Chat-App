import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/*eslint-disable*/
export class ResetPasswordDTO {
  @IsNumber()
  @IsNotEmpty()
  otp!: number;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;
}