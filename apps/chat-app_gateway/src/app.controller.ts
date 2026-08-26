import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('AUTH_Client')
    private readonly authClient: ClientProxy,
  ) {}
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
