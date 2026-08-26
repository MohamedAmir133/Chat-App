import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SignUpDTO } from '@libs/database';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto';
import { ResetPasswordDTO } from 'libs/common/dto/auth/resetPassword.dto';

@Controller()
export class AuthController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('signUp')
  async SignUpController(@Payload() signUpDTO: SignUpDTO) {
    return await this.authService.signUp(signUpDTO);
  }

  @MessagePattern('signIn')
  async SignInController(@Payload() signInDTO: SignInDTO) {
    return await this.authService.signIn(signInDTO);
  }
  @MessagePattern('forgetPassword')
  async ForgetPasswordController(
    @Payload() forgetPasswordDTO: ForgetPasswordDTO,
  ) {
    return await this.authService.forgetPassword(forgetPasswordDTO);
  }
  @MessagePattern('resetPassword')
  async ResetPasswordController(@Payload() resetPasswordDTO: ResetPasswordDTO) {
    return await this.authService.resetPassword(resetPasswordDTO);
  }
}
