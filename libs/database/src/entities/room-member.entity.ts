import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';

export enum UserRoomRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('room_members')
@Unique(['userId', 'roomId'])
export class RoomMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  roomId!: string;

  @Column({ type: 'enum', enum: UserRoomRole, default: UserRoomRole.MEMBER })
  role!: UserRoomRole;

  @CreateDateColumn()
  joinedAt!: Date;
}
