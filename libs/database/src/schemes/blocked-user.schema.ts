import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BlockedUserDocument = HydratedDocument<BlockedUser>;

/*eslint-disable*/

@Schema({ timestamps: true })
export class BlockedUser {
  @Prop({ required: true, unique: true, index: true })
  userId: string; // the user who is doing the blocking

  @Prop({ type: [String], default: [] })
  blocked_ids: string[]; // array of user IDs they have blocked
}

export const BlockedUserSchema = SchemaFactory.createForClass(BlockedUser);
