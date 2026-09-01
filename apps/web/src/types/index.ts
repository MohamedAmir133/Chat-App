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

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  user: User;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  isFavorite?: boolean;
  isBlocked?: boolean;
  roomId?: string; // backend room ID from /rooms
}
