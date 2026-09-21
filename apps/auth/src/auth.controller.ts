import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { UpdatePasswordDTO } from '@libs/common/dto/auth/updatePassword.dto';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';
import { SignUpDTO } from 'libs/common/dto/auth/signUp.dto';
import { Logger } from '@nestjs/common';
/* import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto'; */
/* import { ResetPasswordDTO } from 'libs/common/dto/auth/resetPassword.dto'; */
@Controller()
export class AuthController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('signUp')
  async SignUpController(
    @Payload()
    payload: {
      signUpDTO: SignUpDTO;
      userProfileDto: userProfileDto;
    },
  ) {
    return await this.authService.signUp(
      payload.signUpDTO,
      payload.userProfileDto,
    );
  }

  @MessagePattern('signIn')
  async SignInController(@Payload() signInDTO: SignInDTO) {
    return await this.authService.signIn(signInDTO);
  }
  @MessagePattern('signout')
  SignOutController(@Payload() userId: string) {
    Logger.log('we are in auth Controller');
    return this.authService.signout(userId);
  }
  /*
  @MessagePattern('forgetPassword')
  async ForgetPasswordController(@Payload() dto: ForgetPasswordDTO) {
    return await this.authService.forgetPassword(dto);
  }

  @MessagePattern('resetPassword')
  async ResetPasswordController(@Payload() dto: ResetPasswordDTO) {
    return await this.authService.resetPassword(dto);
  }
  */
  @MessagePattern('updatePassword')
  async UpdatePasswordController(
    @Payload() updatePasswordDTO: UpdatePasswordDTO,
  ) {
    return await this.authService.updatePassword(updatePasswordDTO);
  }
}
