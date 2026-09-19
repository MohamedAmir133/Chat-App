import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, UserEntity } from '@libs/database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '@libs/email';
import { ClientsModule, Transport } from '@nestjs/microservices';

function cleanEnv(val?: string, fallback = ''): string {
  return (val || fallback).replace(/^["']+|["']+$/g, '').trim();
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'User_Client',
        transport: Transport.RMQ,
        options: {
          urls: [
            cleanEnv(process.env.RABBITMQ_URL, 'amqp://guest:guest@localhost:5672'),
          ],
          queue: cleanEnv(process.env.USER_QUEUE, 'user_queue'),
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SecretKey123@#',
      signOptions: { expiresIn: '1d' },
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
