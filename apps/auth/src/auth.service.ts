import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, SignUpDTO } from '@libs/database';
import * as bycrpt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { JwtService } from '@nestjs/jwt';
import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto';
import { ResetPasswordDTO } from 'libs/common/dto/auth/resetPassword.dto';
import { EmailService } from '@libs/email';
/*eslint-disable*/
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  createToken(user: UserEntity): string {
    return this.jwtService.sign({ id: user.id });
  }

  async signUp(signUpDTO: SignUpDTO) {
    if (signUpDTO.password !== signUpDTO.confirmPassword) {
      throw new RpcException('password and confirmPassword does not match');
    }
    const IfUserExists = await this.userRepository.findOneBy({
      email: signUpDTO.email,
    });
    if (IfUserExists) {
      throw new RpcException('User already exists');
    }
    const hashPassword = await bycrpt.hash(signUpDTO.password, 10);
    const user = this.userRepository.create({
      name: signUpDTO.name,
      email: signUpDTO.email,
      password: hashPassword,
    });
    const savedUser = await this.userRepository.save(user);
    const token = this.createToken(savedUser);
    return {
      status: 'success',
      message: 'User created successfully',
      token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
      },
    };
  }

  async signIn(signInDTO: SignInDTO) {
    const user = await this.userRepository.findOneBy({
      email: signInDTO.email,
    });
    if (!user) {
      throw new RpcException('User not found');
    }
    const isPasswordValid = await bycrpt.compare(
      signInDTO.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new RpcException('Invalid password');
    }
    const token = this.createToken(user);
    return {
      status: 'success',
      message: 'User signed in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async forgetPassword(forgetPasswordDTO: ForgetPasswordDTO) {
    const user = await this.userRepository.findOneBy({
      email: forgetPasswordDTO.email,
    });
    if (!user) {
      throw new RpcException('User not found');
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    await this.userRepository.update(user.id, {
      otp: otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
    });
    const resetUrl = `http://localhost:${process.env.PORT || 6000}/auth/reset-password/${otp}`;
    try {
      await this.emailService.sendResetPasswordEmail(user.email, resetUrl);
      return {
        status: 'success',
        message: 'Reset URL sent to your email',
      };
    } catch (err) {
      throw new RpcException('Failed to send email');
    }
  }

  async resetPassword(resetPasswordDTO: ResetPasswordDTO) {
    if (resetPasswordDTO.password !== resetPasswordDTO.confirmPassword) {
      throw new RpcException('password and confirmPassword does not match');
    }
    const user = await this.userRepository.findOneBy({
      otp: resetPasswordDTO.otp,
    });
    if (!user) {
      throw new RpcException('Invalid OTP');
    }
    if (!user.otpExpiry || new Date(user.otpExpiry) < new Date()) {
      await this.userRepository.update(user.id, { otp: null, otpExpiry: null });
      throw new RpcException('OTP expired, please request a new one');
    }
    const hashPassword = await bycrpt.hash(resetPasswordDTO.password, 10);
    await this.userRepository.update(user.id, {
      password: hashPassword,
      otp: null,
      otpExpiry: null,
    });
    const token = this.createToken(user);
    return {
      status: 'success',
      message: 'Password reset successfully',
      token,
    };
  }
}
