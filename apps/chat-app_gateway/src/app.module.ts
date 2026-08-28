import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthHttpController } from './Auth/Auth.controller';
import { UserHttpController } from './user/User.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    ClientsModule.register([
      {
        name: 'AUTH_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.AUTH_QUEUE || 'auth_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
      {
        name: 'USER_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
          ],
          queue: process.env.USER_QUEUE || 'user_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [AppController, AuthHttpController, UserHttpController],
  providers: [AppService],
})
export class AppModule {}
