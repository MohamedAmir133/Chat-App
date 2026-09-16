/*eslint-disable*/

import {
  Body,
  Controller,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SignUpDTO } from '@libs/database';
import { firstValueFrom, timeout } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto';
import type { Response } from 'express';
import { AuthGuard } from 'libs/Guards';
import type { Request } from 'express';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';
import { PresenceService } from '@libs/sockets/presence.service';
import { ChatGateway } from '@libs/sockets/socket.config';

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
    private readonly presenceService: PresenceService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('signup')
  async signUp(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      bio: string;
      profile_picture: string;
      phone_number: string;
      date_of_birth: string;
      gender: string;
      country: string;
      state: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const signUpDTO: SignUpDTO = {
        name: body.name,
        email: body.email,
        password: body.password,
        confirmPassword: body.confirmPassword,
      };
      const userProfileDto: userProfileDto = {
        bio: body.bio,
        profile_picture: body.profile_picture,
        phone_number: body.phone_number,
        date_of_birth: new Date(body.date_of_birth),
        gender: body.gender,
        country: body.country,
        state: body.state,
        user_id: '',
      };
      const result = await firstValueFrom(
        this.authClient.send('signUp', { signUpDTO, userProfileDto }).pipe(timeout(10000)),
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
        this.authClient.send('signIn', signInDTO).pipe(timeout(10000)),
      );
      res.cookie('jwt', result.token, COOKIE_OPTIONS);
      return result;
    } catch (err) {
      throw new BadRequestException(err?.message || err);
    }
  }
  @UseGuards(AuthGuard)
  @Post('signout')
  async signOut(@Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const userId = (req.user as any).id;
    try {
      await firstValueFrom(
        this.authClient.send('signout', userId).pipe(timeout(5000)),
      );
    } catch (e) {
      Logger.warn(`authClient signout error: ${(e as Error).message}`);
    }

    // 1. Immediately clear presence from Redis
    if (userId) {
      await this.presenceService.clearUserPresence(String(userId));
    }

    // 2. Disconnect any active sockets for this user and broadcast offline status
    try {
      if (this.chatGateway?.server && userId) {
        this.chatGateway.server.to(`user:${userId}`).disconnectSockets(true);
        this.chatGateway.server.emit('user_status_changed', {
          userId: String(userId),
          status: 'offline',
          lastSeen: new Date(),
        });
        Logger.log(`[signOut] Broadcasted user_status_changed offline for userId=${userId}`);
      }
    } catch (e) {
      Logger.error(`Error during socket teardown on signOut: ${(e as Error).message}`);
    }

    res.clearCookie('jwt');
    return { status: 'success', message: 'Signed out successfully' };
  }

  @Post('forget-password')
  async forgetPassword(@Body() forgetPasswordDTO: ForgetPasswordDTO) {
    try {
      const result = await firstValueFrom(
        this.authClient.send('forgetPassword', forgetPasswordDTO).pipe(timeout(10000)),
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
    @Body()
    {
      oldPassword,
      newPassword,
      confirmNewPassword,
    }: { oldPassword: string; newPassword: string; confirmNewPassword: string },
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
