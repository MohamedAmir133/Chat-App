import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { UserRole } from '@libs/database';

/*eslint-disable*/
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Events from Auth Service

  @EventPattern('user.registered')
  async onUserRegistered(@Payload() data: { userId: string; [key: string]: any }) {
    const { userId, ...rest } = data;
    await this.userService.createProfile({
      user_id: userId,
      ...rest,
    });
  }

  @EventPattern('user.logged_in')
  async onUserLoggedIn(@Payload() data: { userId: string }) {
    await this.userService.setOnline(data.userId);
  }

  @EventPattern('user.logged_out')
  async onUserLoggedOut(@Payload() data: { userId: string }) {
    await this.userService.setOffline(data.userId);
  }

  //  Normal User Operations

  @MessagePattern('getMe')
  async getMe(@Payload() data: { userId: string }) {
    return await this.userService.getMe(data.userId);
  }

  @MessagePattern('updateMe')
  async updateMe(@Payload() data: { userId: string; [key: string]: any }) {
    const { userId, ...dto } = data;
    return await this.userService.updateMe(userId, dto);
  }

  @MessagePattern('deleteMe')
  async deleteMe(@Payload() data: { userId: string }) {
    return await this.userService.deleteMe(data.userId);
  }

  @MessagePattern('getUser')
  async getUserById(@Payload() data: { viewerId: string; targetId: string }) {
    return await this.userService.getUserById(data.viewerId, data.targetId);
  }

  @MessagePattern('searchUsers')
  async searchUsers(@Payload() data: { query: string; viewerId: string }) {
    return await this.userService.searchUsers(data.query, data.viewerId);
  }

  @MessagePattern('blockUser')
  async blockUser(@Payload() data: { blockerId: string; blockedId: string }) {
    return await this.userService.blockUser(data.blockerId, data.blockedId);
  }

  @MessagePattern('unblockUser')
  async unblockUser(@Payload() data: { blockerId: string; blockedId: string }) {
    return await this.userService.unblockUser(data.blockerId, data.blockedId);
  }

  @MessagePattern('getBlockedUsers')
  async getBlockedList(@Payload() data: { userId: string }) {
    return await this.userService.getBlockedList(data.userId);
  }

  // Admin Operations

  @MessagePattern('getAllUsers')
  async getAllUsers(@Payload() data: { page?: number; limit?: number; search?: string; role?: UserRole }) {
    return await this.userService.getAllUsers();
  }

  @MessagePattern('adminDeleteUser')
  async adminDeleteUser(@Payload() data: { targetId: string }) {
    return await this.userService.adminDeleteUser(data.targetId);
  }

  @MessagePattern('changeUserRole')
  async changeUserRole(@Payload() data: { targetId: string; newRole: UserRole }) {
    return await this.userService.changeUserRole(data.targetId, data.newRole);
  }
}
