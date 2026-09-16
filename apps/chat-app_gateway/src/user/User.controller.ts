/*eslint-disable*/
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import type { Request, Response } from 'express';
import { AuthGuard, RolesGuard, Roles } from 'libs/Guards';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';
import { UserRole } from '@libs/database';
import { PresenceService } from '@libs/sockets/presence.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('user')
export class UserHttpController {
  constructor(
    @Inject('USER_Client')
    private readonly userClient: ClientProxy,
    private readonly presenceService: PresenceService,
  ) {}

  // ─── Normal User Routes ──────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    return await firstValueFrom(
      this.userClient.send('getMe', { userId: (req.user as any).id }).pipe(
        timeout(10000),
      ),
    );
  }

  @UseGuards(AuthGuard)
  @Put('me')
  async updateMe(@Req() req: Request, @Body() dto: Partial<userProfileDto>) {
    return await firstValueFrom(
      this.userClient.send('updateMe', {
        userId: (req.user as any).id,
        ...dto,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Delete('me')
  async deleteMe(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = (req.user as any).id;
    const result = await firstValueFrom(
      this.userClient.send('deleteMe', { userId }),
    );
    res.clearCookie('jwt');
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('search')
  async searchUsers(@Req() req: Request) {
    const query = req.query.q as string;
    return await firstValueFrom(
      this.userClient.send('searchUsers', {
        query,
        viewerId: (req.user as any).id,
      }),
    );
  }

  // ─── Presence — reads directly from Redis, no RabbitMQ hop ─────────────

  /** GET /user/presence/:userId — returns { userId, isOnline } */
  @UseGuards(AuthGuard)
  @Get('presence/:userId')
  async getUserPresence(@Param('userId') userId: string) {
    const isOnline = await this.presenceService.isUserOnline(userId);
    return { userId, isOnline };
  }

  /** POST /user/presence/batch — body: { userIds: string[] }
   *  Returns [{ userId, isOnline }, ...] for all requested ids at once.
   */
  @UseGuards(AuthGuard)
  @Post('presence/batch')
  async getBatchPresence(@Body() body: { userIds: string[] }) {
    const ids: string[] = Array.isArray(body?.userIds) ? body.userIds : [];
    const results = await Promise.all(
      ids.map(async (userId) => ({
        userId,
        isOnline: await this.presenceService.isUserOnline(userId),
      })),
    );
    return results;
  }

  @UseGuards(AuthGuard)
  @Get('blocked-users')
  async getBlockedUsers(@Req() req: Request) {
    return await firstValueFrom(
      this.userClient.send('getBlockedUsers', {
        userId: (req.user as any).id,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async getUser(@Req() req: Request, @Param('id') id: string) {
    return await firstValueFrom(
      this.userClient.send('getUser', {
        viewerId: (req.user as any).id,
        targetId: id,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/block')
  async blockUser(@Req() req: Request, @Param('id') id: string) {
    return await firstValueFrom(
      this.userClient.send('blockUser', {
        blockerId: (req.user as any).id,
        blockedId: id,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':id/block')
  async unblockUser(@Req() req: Request, @Param('id') id: string) {
    return await firstValueFrom(
      this.userClient.send('unblockUser', {
        blockerId: (req.user as any).id,
        blockedId: id,
      }),
    );
  }

  // ─── Admin Routes ────────────────────────────────────────────────────────

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  async getAllUsers() {
    return await firstValueFrom(this.userClient.send('getAllUsers', {}));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('admin/:id')
  async adminDeleteUser(@Param('id') id: string) {
    return await firstValueFrom(
      this.userClient.send('adminDeleteUser', { targetId: id }),
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('admin/:id/role')
  async changeUserRole(
    @Param('id') id: string,
    @Body() body: { newRole: UserRole },
  ) {
    return await firstValueFrom(
      this.userClient.send('changeUserRole', {
        targetId: id,
        newRole: body.newRole,
      }),
    );
  }
}
