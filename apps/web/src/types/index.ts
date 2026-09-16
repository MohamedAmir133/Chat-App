export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  bio?: string;
  profile_picture?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  state?: string;
  isOnline?: boolean;
}

export interface GroupMember extends User {
  role: 'owner' | 'admin' | 'member';
  joinedAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  fileUrl?: string;
  messageType?: 'text' | 'image' | 'video' | 'document';
  createdAt: string;       // formatted time e.g. "09:15 AM"
  rawCreatedAt?: string;   // full ISO string for date separator grouping
  status?: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface Conversation {
  user: User;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  isBlocked?: boolean;
  isSelfRoom?: boolean;    // true for "Saved Messages" self-chat
  isGroup?: boolean;       // true for group chats
  roomId?: string;         // backend room ID from /rooms
  members?: GroupMember[]; // for group chats with roles
  memberCount?: number;    // for group chats
}

// WebSocket event payloads
export interface MemberAddedEvent {
  roomId: string;
  addedBy: string;
  members: GroupMember[];
  room?: any;
}

export interface MemberRemovedEvent {
  roomId: string;
  userId: string;
  removedBy: string;
}

export interface GroupUpdatedEvent {
  roomId: string;
  updatedBy: string;
  updates: {
    name?: string;
    description?: string;
    group_picture?: string;
  };
  room?: any;
}

export interface GroupCreatedEvent {
  roomId: string;
  room: any;
  createdBy: string;
}

