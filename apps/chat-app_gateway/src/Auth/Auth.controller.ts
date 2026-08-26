import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SignUpDTO } from '@libs/database';
import { firstValueFrom } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
/*eslint-disable */
@Controller('auth')
export class AuthHttpController {
  constructor(
    @Inject('AUTH_Client')
    private readonly authClient: ClientProxy,
  ) {}

  @Post('signup')
  async signUp(@Body() signUpDTO: SignUpDTO) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('signUp', signUpDTO),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Post('signin')
  signIn() {
    return 'signin';
  }
  @Post('signout')
  signOut() {
    return 'signout';
  }
  @Post('forget-password')
  forgetPassword() {
    return 'forget-password';
  }
  @Post('reset-password')
  resetPassword() {
    return 'reset-password';
  }
}
