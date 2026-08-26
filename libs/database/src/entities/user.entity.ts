import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'int', nullable: true })
  otp?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiry?: Date | null;
}
