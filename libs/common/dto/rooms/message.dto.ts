import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export class messageDto {
  @IsString()
  chatRoomId: string;

  @IsString()
  senderId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;
}
