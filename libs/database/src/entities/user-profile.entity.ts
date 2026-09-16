import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_profiles')
export class UserProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Foreign key relation - user_id column is managed by @JoinColumn
  @Column({ unique: true })
  user_id!: string; // matches UserEntity.id from Auth Service
  
  @OneToOne(() => UserEntity, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  profile_picture?: string;

  @Column({ nullable: true })
  phone_number?: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth?: Date;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  state?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
