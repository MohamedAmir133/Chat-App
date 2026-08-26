import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, UserEntity } from '@libs/database';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '@libs/email';

@Module({
  imports: [
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
