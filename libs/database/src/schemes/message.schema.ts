import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

/*eslint-disable*/

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, index: true })
  chatRoomId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: false, default: '' })
  content: string;

  @Prop({ type: String })
  fileUrl?: string; // URL for attached file (image, video, document)

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'document'],
    default: 'text',
  })
  messageType: string;

  @Prop({type:Boolean,default:false})
  isEdited : boolean;

  @Prop({type:Boolean,default:false})
  isDeleted : boolean;
  
  @Prop({type:Boolean,default:false})
  isForwarded : boolean;
  
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Optimized for: "Find all messages in a room, ordered by newest first"
MessageSchema.index({ chatRoomId: 1, createdAt: -1 });
