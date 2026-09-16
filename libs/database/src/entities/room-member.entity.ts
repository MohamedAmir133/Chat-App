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

  // @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'userId' })
  // user!: UserEntity;
  @Column()
  userId!: string;

  // @ManyToOne(() => RoomEntity, room => room.members, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'roomId' })
  // room!: RoomEntity;
  @Column()
  roomId!: string;

  @Column({ type: 'enum', enum: UserRoomRole, default: UserRoomRole.MEMBER })
  role!: UserRoomRole;

  @CreateDateColumn()
  joinedAt!: Date;
}
