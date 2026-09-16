import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { ChatGateway } from './socket.config';
import { PresenceService } from './presence.service';

dotenv.config();

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [ChatGateway, PresenceService],
  // Export both so other modules can inject them if needed
  exports: [ChatGateway, PresenceService],
})
export class SocketModule {}
