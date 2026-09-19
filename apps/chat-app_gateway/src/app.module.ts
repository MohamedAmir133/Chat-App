import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthHttpController } from './Auth/Auth.controller';
import { UserHttpController } from './user/User.controller';
import { ChatHttpController } from './Chat/chat.controller';
import { AdminController } from './admin/admin.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { SocketModule } from '@libs/sockets/socket.module';
import * as dotenv from 'dotenv';

dotenv.config();

function cleanEnv(val?: string, fallback = ''): string {
  return (val || fallback).replace(/^["']+|["']+$/g, '').trim();
}

@Module({
  imports: [
    SocketModule,
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
            cleanEnv(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672'),
          ],
          queue: cleanEnv(process.env.AUTH_QUEUE, 'auth_queue'),
          queueOptions: {
            durable: false,
          },
          persistent: true,
          prefetchCount: 1,
          socketOptions: {
            reconnect: true,
            reconnectDelayMax: 5000,
          },
        },
      },
      {
        name: 'CHAT_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            cleanEnv(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672'),
          ],
          queue: cleanEnv(process.env.CHAT_QUEUE, 'chat_queue'),
          queueOptions: {
            durable: false,
          },
          persistent: true,
          prefetchCount: 1,
          socketOptions: {
            reconnect: true,
            reconnectDelayMax: 5000,
          },
        },
      },
      {
        name: 'USER_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            cleanEnv(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672'),
          ],
          queue: cleanEnv(process.env.USER_QUEUE, 'user_queue'),
          queueOptions: {
            durable: false,
          },
          persistent: true,
          prefetchCount: 1,
          socketOptions: {
            reconnect: true,
            reconnectDelayMax: 5000,
          },
        },
      },
    ]),
  ],
  controllers: [
    AppController,
    AuthHttpController,
    UserHttpController,
    ChatHttpController,
    AdminController,
  ],
  providers: [AppService],
})
export class AppModule {}
