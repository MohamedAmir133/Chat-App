import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SignUpDTO } from '@libs/database';

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
}
