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
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { Request } from 'express';
import { AuthGuard, RolesGuard, Roles } from 'libs/Guards';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';
import { UserRole } from '@libs/database';

@Controller('user')
export class UserHttpController {
  constructor(
    @Inject('USER_Client')
    private readonly userClient: ClientProxy,
  ) {}

  // ─── Normal User Routes ──────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    return await firstValueFrom(
      this.userClient.send('getMe', { userId: (req.user as any).id }),
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
  async deleteMe(@Req() req: Request) {
    return await firstValueFrom(
      this.userClient.send('deleteMe', { userId: (req.user as any).id }),
    );
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
