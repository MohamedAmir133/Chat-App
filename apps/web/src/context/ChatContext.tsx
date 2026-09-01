'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Conversation, Message, User } from '@/types';
import { useAuth } from './AuthContext';
import { apiRequest } from '@/lib/api';

// ─── Chat Context ─────────────────────────────────────────────────────────────

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeTab: 'all' | 'unread' | 'favorites' | 'blocked';
  searchQuery: string;
  blockedUserIds: string[];
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  setActiveTab: (tab: 'all' | 'unread' | 'favorites' | 'blocked') => void;
  setSearchQuery: (query: string) => void;
  selectConversation: (conversation: Conversation) => void;
  sendMessage: (content: string) => Promise<void>;
  startDirectChat: (targetUserId: string, targetUser: User) => Promise<void>;
  toggleFavorite: (userId: string) => void;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  filteredConversations: Conversation[];
  refreshRooms: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ─── Sample demo conversations (shown when NOT authenticated) ─────────────────
const DEMO_CONVERSATIONS: Conversation[] = [
  {
    user: {
      id: 'u1',
      name: 'Anna Johnson',
      email: 'anna.j@example.com',
      profile_picture:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
      bio: 'Product Designer @Sunday',
    },
    lastMessage: { content: "Hey! How's it going today?", timestamp: '09:15 AM', senderId: 'u1' },
    unreadCount: 4,
    isFavorite: true,
  },
  {
    user: {
      id: 'u2',
      name: 'Brian Carter',
      email: 'brian.c@example.com',
      profile_picture:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isOnline: false,
    },
    lastMessage: { content: 'Can you help me figure this out?', timestamp: '09:22 AM', senderId: 'u2' },
    unreadCount: 0,
  },
  {
    user: {
      id: 'u3',
      name: 'Clara Smith',
      email: 'clara.s@example.com',
      profile_picture:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
    },
    lastMessage: { content: "OMG, you won't believe what just happened!", timestamp: '09:30 AM', senderId: 'u3' },
    unreadCount: 0,
    isFavorite: true,
  },
  {
    user: {
      id: 'u4',
      name: 'David Brown',
      email: 'david.b@example.com',
      profile_picture:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      isOnline: false,
    },
    lastMessage: { content: 'Do you have a minute to talk?', timestamp: '09:45 AM', senderId: 'u4' },
    unreadCount: 1,
  },
  {
    user: {
      id: 'u5',
      name: 'Henry Moore',
      email: 'henry.m@example.com',
      profile_picture:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
    },
    lastMessage: { content: "Just checking in—how's everything?", timestamp: '10:35 AM', senderId: 'u5' },
    unreadCount: 5,
  },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  u1: [
    { id: 'm1', senderId: 'u1', recipientId: 'me', content: 'Hi there! Did you see the new designs?', createdAt: '09:10 AM', status: 'read' },
    { id: 'm2', senderId: 'me', recipientId: 'u1', content: 'Yes! They look super clean. Love the orange accents.', createdAt: '09:12 AM', status: 'read' },
    { id: 'm3', senderId: 'u1', recipientId: 'me', content: "Hey! How's it going today?", createdAt: '09:15 AM', status: 'delivered' },
  ],
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(DEMO_MESSAGES);
  const [roomIdMap, setRoomIdMap] = useState<Record<string, string>>({});        // userId -> roomId
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'favorites' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ─── Load Rooms from Backend when Authenticated ──────────────────────────
  const refreshRooms = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoadingRooms(true);
    try {
      const rooms = await apiRequest<any[]>('/rooms');
      if (!Array.isArray(rooms) || rooms.length === 0) {
        setConversations([]);
        setMessagesMap({});
        setActiveConversation(null);
        return;
      }

      const convs: Conversation[] = rooms.map((room) => {
        // For 1-on-1 rooms, the "other" user is fetched from members
        const otherMember = room.members?.find((m: any) => m.userId !== user.id);
        const lastMsg = room.lastMessage;

        const conv: Conversation = {
          user: {
            id: otherMember?.userId || room.id,
            name: otherMember?.name || room.name || 'Unknown',
            email: otherMember?.email || '',
            profile_picture: otherMember?.profile_picture,
            isOnline: false,
          },
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                timestamp: new Date(lastMsg.createdAt || '').toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                senderId: lastMsg.senderId,
              }
            : undefined,
          unreadCount: 0,
          roomId: room.id,
        };

        return conv;
      });

      // Build roomId map: userId -> roomId
      const map: Record<string, string> = {};
      rooms.forEach((room) => {
        const other = room.members?.find((m: any) => m.userId !== user.id);
        if (other) {
          map[other.userId] = room.id;
        }
      });
      setRoomIdMap(map);
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setConversations([]);
      setMessagesMap({});
      setActiveConversation(null);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshRooms();
      // Load blocked users
      apiRequest<string[]>('/user/blocked-users')
        .then((list) => { if (Array.isArray(list)) setBlockedUserIds(list); })
        .catch(() => {});
    } else {
      // Show demo conversations when not authenticated
      setConversations(DEMO_CONVERSATIONS);
      setMessagesMap(DEMO_MESSAGES);
    }
  }, [user?.id]);

  // ─── Load Messages for Active Conversation ───────────────────────────────
  const loadMessages = async (conv: Conversation, silent = false) => {
    const roomId = conv.roomId || roomIdMap[conv.user.id];
    if (!roomId || !user) return;

    if (!silent) setIsLoadingMessages(true);
    try {
      const data = await apiRequest<{ messages: any[] }>(`/rooms/${roomId}/messages`);
      const msgs: Message[] = (data.messages || []).map((m: any) => {
        const senderId = m.senderId || m.sender_id || m.userId;
        return {
          id: m._id || m.id,
          senderId: senderId,
          recipientId: m.recipientId || (senderId === user.id ? conv.user.id : user.id),
          content: m.content,
          createdAt: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          status: 'read',
        };
      });
      setMessagesMap((prev) => ({ ...prev, [conv.user.id]: msgs }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    // Mark messages as read
    setConversations((prev) =>
      prev.map((c) => (c.user.id === conversation.user.id ? { ...c, unreadCount: 0 } : c)),
    );
    if (user) {
      loadMessages(conversation);
    }
  };

  // ─── Polling for Real-Time Updates ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshRooms(true);
      if (activeConversation) {
        loadMessages(activeConversation, true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [user, activeConversation, roomIdMap]);

  // ─── Start Direct Chat (create room if needed) ───────────────────────────
  const startDirectChat = async (targetUserId: string, targetUser: User) => {
    if (!user) return;

    // Check if room already exists
    const existingRoomId = roomIdMap[targetUserId];
    if (existingRoomId) {
      const existingConv = conversations.find((c) => c.user.id === targetUserId);
      if (existingConv) {
        selectConversation(existingConv);
        return;
      }
    }

    try {
      const result = await apiRequest<any>('/rooms/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });

      const roomId = result.room?.id;
      if (roomId) {
        setRoomIdMap((prev) => ({ ...prev, [targetUserId]: roomId }));
        const newConv: Conversation = {
          user: targetUser,
          unreadCount: 0,
          roomId,
        };
        setConversations((prev) => {
          const exists = prev.some((c) => c.user.id === targetUserId);
          return exists ? prev : [newConv, ...prev];
        });
        setActiveConversation(newConv);
      }
    } catch (err) {
      console.error('Failed to start direct chat:', err);
    }
  };

  // ─── Send Message ────────────────────────────────────────────────────────
  const sendMessage = async (content: string) => {
    if (!activeConversation || !content.trim()) return;

    const myId = user?.id || 'me';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: myId,
      recipientId: activeConversation.user.id,
      content: content.trim(),
      createdAt: now,
      status: 'sent',
    };

    // Optimistic update
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversation.user.id]: [...(prev[activeConversation.user.id] || []), optimisticMsg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.user.id === activeConversation.user.id
          ? { ...c, lastMessage: { content: content.trim(), timestamp: now, senderId: myId } }
          : c,
      ),
    );

    // Call backend if authenticated
    if (user) {
      const roomId = activeConversation.roomId || roomIdMap[activeConversation.user.id];
      if (roomId) {
        try {
          await apiRequest(`/rooms/${roomId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content: content.trim() }),
          });
        } catch (err) {
          console.error('Failed to send message to backend:', err);
        }
      }
    }
  };

  // ─── Block / Unblock ─────────────────────────────────────────────────────
  const toggleFavorite = (userId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.user.id === userId ? { ...c, isFavorite: !c.isFavorite } : c)),
    );
  };

  const blockUser = async (userId: string) => {
    try {
      if (user) await apiRequest(`/user/${userId}/block`, { method: 'POST' });
      setBlockedUserIds((prev) => [...prev, userId]);
      setConversations((prev) =>
        prev.map((c) => (c.user.id === userId ? { ...c, isBlocked: true } : c)),
      );
    } catch (err) { console.error('Failed to block user', err); }
  };

  const unblockUser = async (userId: string) => {
    try {
      if (user) await apiRequest(`/user/${userId}/block`, { method: 'DELETE' });
      setBlockedUserIds((prev) => prev.filter((id) => id !== userId));
      setConversations((prev) =>
        prev.map((c) => (c.user.id === userId ? { ...c, isBlocked: false } : c)),
      );
    } catch (err) { console.error('Failed to unblock user', err); }
  };

  // ─── Filter Conversations ─────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isBlocked = blockedUserIds.includes(c.user.id) || c.isBlocked;
    if (activeTab === 'blocked') return isBlocked && matchesSearch;
    if (isBlocked) return false;
    if (activeTab === 'unread') return c.unreadCount > 0 && matchesSearch;
    if (activeTab === 'favorites') return c.isFavorite && matchesSearch;
    return matchesSearch;
  });

  const activeMessages = activeConversation ? messagesMap[activeConversation.user.id] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages: activeMessages,
        activeTab,
        searchQuery,
        blockedUserIds,
        isLoadingRooms,
        isLoadingMessages,
        setActiveTab,
        setSearchQuery,
        selectConversation,
        sendMessage,
        startDirectChat,
        toggleFavorite,
        blockUser,
        unblockUser,
        filteredConversations,
        refreshRooms,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
