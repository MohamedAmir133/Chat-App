import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  CreateDateColumn,
} from 'typeorm';

export enum RoomType {
  ONE_ONE = 'one_one',
  GROUP = 'group',
}

@Entity('rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'enum', enum: RoomType, default: RoomType.ONE_ONE })
  type!: RoomType;

  @Column()
  owner_id!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  group_picture?: string; // Group avatar/photo

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  // @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'owner_id' })
  // owner!: UserEntity;

  // @OneToMany(() => RoomMember, member => member.room)
  // members!: RoomMember[];
}
