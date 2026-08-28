import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@libs/database';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// // Any logged-in user
// @UseGuards(AuthGuard)
// @Get('profile')
// getProfile() {}
// // Admin only
// @UseGuards(AuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)   // ← type-safe, no typos
// @Delete('user/:id')
// deleteUser() {}
