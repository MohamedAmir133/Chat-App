/*eslint-disable*/

import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SignUpDTO } from '@libs/database';
import { firstValueFrom } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto';
import type { Response } from 'express';
import { AuthGuard } from 'libs/Guards';
import type { Request } from 'express';

const COOKIE_OPTIONS = {
  maxAge: 1000 * 60 * 60 * 24 * 7,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // only secure in prod
  sameSite: 'strict' as const,
};

@Controller('auth')
export class AuthHttpController {
  constructor(
    @Inject('AUTH_Client')
    private readonly authClient: ClientProxy,
  ) {}

  @Post('signup')
  async signUp(
    @Body() signUpDTO: SignUpDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('signUp', signUpDTO),
      );
      res.cookie('jwt', result.token, COOKIE_OPTIONS);
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Post('signin')
  async signIn(
    @Body() signInDTO: SignInDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('signIn', signInDTO),
      );
      res.cookie('jwt', result.token, COOKIE_OPTIONS);
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Post('signout')
  signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
    return { status: 'success', message: 'Signed out successfully' };
  }

  @Post('forget-password')
  async forgetPassword(@Body() forgetPasswordDTO: ForgetPasswordDTO) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('forgetPassword', forgetPasswordDTO),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }

  @Post('reset-password/:otp')
  async resetPassword(
    @Body()
    {
      password,
      confirmPassword,
    }: { password: string; confirmPassword: string },
    @Param('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('resetPassword', {
          password,
          confirmPassword,
          otp: Number(otp),
        }),
      );
      res.cookie('jwt', result.token, COOKIE_OPTIONS);
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
  @UseGuards(AuthGuard)
  @Post('update-password')
  async updatePassword(
    @Body() { oldPassword, newPassword, confirmNewPassword }: { oldPassword: string; newPassword: string; confirmNewPassword: string },
    @Req() req: Request,
  ) {
    try {
      const userId = (req.user as any).id; // JWT payload contains { id }
      const result = await firstValueFrom(
        this.authClient.send('updatePassword', {
          userId,
          oldPassword,
          newPassword,
          confirmNewPassword,
        }),
      );
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
}
