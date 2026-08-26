import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, SignUpDTO } from '@libs/database';
import * as bycrpt from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
/*eslint-disable*/
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

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
    return {
      status: 'success',
      message: 'User created successfully',
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
      },
    };
  }
}
