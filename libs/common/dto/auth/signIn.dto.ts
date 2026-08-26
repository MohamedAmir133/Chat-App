import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
/*eslint-disable*/
export class SignInDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
