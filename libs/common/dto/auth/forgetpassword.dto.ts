import { IsEmail, IsNotEmpty } from 'class-validator';
/*eslint-disable*/
export class ForgetPasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
