import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, SignUpDTO } from '@libs/database';
import * as bycrpt from 'bcryptjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { SignInDTO } from 'libs/common/dto/auth/signIn.dto';
import { JwtService } from '@nestjs/jwt';
import { ForgetPasswordDTO } from 'libs/common/dto/auth/forgetpassword.dto';
import { ResetPasswordDTO } from 'libs/common/dto/auth/resetPassword.dto';
import { EmailService } from '@libs/email';
import { UpdatePasswordDTO } from 'libs/common/dto/auth/updatePassword.dto';
import { userProfileDto } from '@libs/common/dto/users/userProfile.dto';
/*eslint-disable*/
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @Inject('User_Client') private readonly userClient: ClientProxy,
  ) {}

  createToken(user: UserEntity): string {
    return this.jwtService.sign({ id: user.id, role: user.role });
  }
  signout(userId: string) {
    Logger.log('we are in Auth service');
    this.userClient.emit('user.logged_out', { userId: userId });
    return {
      status: 'success',
      message: 'User signed out successfully',
    };
  }
  async signUp(signUpDTO: SignUpDTO, userProfileDto: userProfileDto) {
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

    // Emit event to create user profile in User Service
    this.userClient.emit('user.registered', {
      userId: savedUser.id,
      ...userProfileDto,
    });
    return {
      status: 'success',
      message: 'User created successfully',
      token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async signIn(signInDTO: SignInDTO) {
    const user = await this.userRepository.findOne({
      where: { email: signInDTO.email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
      },
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
    this.userClient.emit('user.logged_in', { userId: user.id });
    return {
      status: 'success',
      message: 'User signed in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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
      await this.emailService.sendResetPasswordEmail(user.email, otp, resetUrl);
      Logger.log(`[ForgetPassword] Reset OTP ${otp} sent to ${user.email}`);
      return {
        status: 'success',
        message: 'Reset OTP sent to your email. Please check your inbox (or Spam folder).',
      };
    } catch (err: any) {
      Logger.error(
        `[ForgetPassword] Email delivery failed for ${user.email}: ${err?.message}`,
      );
      throw new RpcException('Failed to send email. Please check your email configuration or network.');
    }
  }

  async resetPassword(resetPasswordDTO: ResetPasswordDTO) {
    if (resetPasswordDTO.password !== resetPasswordDTO.confirmPassword) {
      throw new RpcException('password and confirmPassword does not match');
    }
    const otpNum = Number(resetPasswordDTO.otp);
    if (!otpNum || isNaN(otpNum)) {
      throw new RpcException('Invalid OTP format');
    }
    const user = await this.userRepository.findOneBy({
      otp: otpNum,
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
  async updatePassword(updatePasswordDTO: UpdatePasswordDTO) {
    const user = await this.userRepository.findOne({
      where: { id: updatePasswordDTO.userId },
      select: {
        id: true,
        password: true,
      },
    });
    if (!user) {
      throw new RpcException('User not found');
    }
    if (
      updatePasswordDTO.newPassword !== updatePasswordDTO.confirmNewPassword
    ) {
      throw new RpcException(
        'newPassword and confirmNewPassword does not match',
      );
    }
    const isPasswordValid = await bycrpt.compare(
      updatePasswordDTO.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new RpcException('Old password is incorrect');
    }
    const hashPassword = await bycrpt.hash(updatePasswordDTO.newPassword, 10);
    await this.userRepository.update(user.id, {
      password: hashPassword,
    });
    const token = this.createToken(user);
    return {
      status: 'success',
      message: 'Password updated successfully',
      token,
    };
  }
}
