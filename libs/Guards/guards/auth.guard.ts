import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
/*eslint-disable*/
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // first try Bearer token from Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (!token) throw new UnauthorizedException('Unauthorized');
      try {
        request.user = this.jwtService.verify(token);
        return true;
      } catch (error) {
        this.logger.error(error);
        throw new UnauthorizedException('Invalid token');
      }
    }

    //else check in cookie
    const token = request.cookies?.jwt;
    if (!token) throw new UnauthorizedException('Unauthorized');
    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
