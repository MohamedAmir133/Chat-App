import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserProfileEntity } from './user-profile.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'int', nullable: true })
  otp?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiry?: Date | null;

  // Added relation to cascade deletes when user is removed
  @OneToOne(() => UserProfileEntity, profile => profile.user)
  profile: UserProfileEntity;
}
