'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Socket } from 'socket.io-client';
import { Conversation, Message, User } from '@/types';
import { useAuth } from './AuthContext';
import { apiRequest } from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';

// ─── Chat Context type ────────────────────────────────────────────────────────

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  activeTab: 'all' | 'unread' | 'blocked' | 'archived';
  searchQuery: string;
  blockedUserIds: string[];
  archivedConversationIds: string[];
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  isSocketConnected: boolean;
  loadRoomError: string | null;
  typingUsers: Record<string, boolean>;
  sendTyping: (isTyping: boolean) => void;
  setActiveTab: (tab: 'all' | 'unread' | 'blocked' | 'archived') => void;
  setSearchQuery: (query: string) => void;
  selectConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, fileUrl?: string, messageType?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startDirectChat: (targetUserId: string, targetUser: User) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  archiveConversation: (userId: string) => void;
  unarchiveConversation: (userId: string) => void;
  filteredConversations: Conversation[];
  refreshRooms: () => Promise<void>;
  refreshRoomsRef: React.MutableRefObject<(silent?: boolean) => Promise<void>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ─── Demo data (shown when NOT authenticated) ─────────────────────────────────

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

  // ── State ────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(DEMO_MESSAGES);
  const [roomIdMap, setRoomIdMap] = useState<Record<string, string>>({});   // userId -> roomId
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'blocked' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [loadRoomError, setLoadRoomError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Archive state — persisted in localStorage
  const [archivedConversationIds, setArchivedConversationIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('archived_conv_ids') || '[]');
    } catch { return []; }
  });

  // Keep a stable ref so socket callbacks always see the latest conversations
  const conversationsRef = useRef<Conversation[]>(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Keep a stable ref to activeConversation so the socket handler can see it
  const activeConversationRef = useRef<Conversation | null>(activeConversation);
  useEffect(() => { activeConversationRef.current = activeConversation; }, [activeConversation]);

  // Keep roomIdMap stable in a ref for socket callbacks
  const roomIdMapRef = useRef<Record<string, string>>(roomIdMap);
  useEffect(() => { roomIdMapRef.current = roomIdMap; }, [roomIdMap]);

  // Socket instance
  const socketRef = useRef<Socket | null>(null);

  // Keep a stable ref to refreshRooms so socket callbacks always get the latest version
  const refreshRoomsRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  // Presence snapshot from the gateway — stored in a ref so refreshRooms
  // can read the latest value without being in its dependency array
  const presenceSnapshotRef = useRef<Set<string>>(new Set());

  // ── Load Rooms ───────────────────────────────────────────────────────────
  const refreshRooms = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoadingRooms(true);
    setLoadRoomError(null);
    try {
      const rooms = await apiRequest<any[]>('/rooms');
      if (!Array.isArray(rooms) || rooms.length === 0) {
        setConversations([]);
        setMessagesMap({});
        setActiveConversation(null);
        return;
      }

      const convs: Conversation[] = rooms.map((room) => {
        const isSelfRoom =
          room.isSelfRoom === true ||
          (room.members?.length > 0 && room.members.every((m: any) => m.userId === user.id));
        
        // Check if it's a group chat (more than 2 members or explicitly marked as GROUP)
        const isGroup = room.type?.toUpperCase() === 'GROUP' || (room.members && room.members.length > 2);
        
        if (isGroup) {
          // Group chat: use group info
          const lastMsg = room.lastMessage;
          return {
            user: {
              id: room.id, // Use roomId as the identifier for groups
              name: room.name || 'Unnamed Group',
              email: '', // Groups don't have email
              profile_picture: room.group_picture || undefined,
              isOnline: false, // Groups don't have online status
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
            isGroup: true,
            memberCount: room.memberCount || room.members?.length || 0,
            members: room.members?.map((m: any) => ({
              id: m.userId,
              name: m.name || 'Unknown',
              email: m.email || '',
              profile_picture: m.profile_picture,
              isOnline: false,
              role: m.role,
            })),
          } satisfies Conversation;
        }
        
        // For self-rooms both members are the current user — use current user as the "other" side
        const otherMember = isSelfRoom
          ? room.members?.[0]
          : room.members?.find((m: any) => m.userId !== user.id);
        const lastMsg = room.lastMessage;
        return {
          user: {
            id: isSelfRoom ? user.id : (otherMember?.userId || room.id),
            name: isSelfRoom ? 'Saved Messages' : (otherMember?.name || room.name || 'Unknown'),
            email: isSelfRoom ? (user.email || '') : (otherMember?.email || ''),
            profile_picture: isSelfRoom ? user.profile_picture : otherMember?.profile_picture,
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
          isSelfRoom,
        } satisfies Conversation;
      });

      const map: Record<string, string> = {};
      rooms.forEach((room) => {
        if (room.isSelfRoom) {
          // Map the current user's own id to the self-room
          map[user.id] = room.id;
        } else if (room.type?.toUpperCase() === 'GROUP' || (room.members && room.members.length > 2)) {
          // For groups, map the roomId to itself for easy lookup
          map[room.id] = room.id;
        } else {
          const other = room.members?.find((m: any) => m.userId !== user.id);
          if (other) map[other.userId] = room.id;
        }
      });

      // ── Enrich with live presence ─────────────────────────────────────
      // Try the REST batch endpoint first; fall back to whatever the socket
      // snapshot already told us (presenceSnapshotRef).
      
      // Collect all user IDs including group members
      const allUserIds = new Set<string>();
      convs.forEach((c) => {
        allUserIds.add(c.user.id);
        // Add all group member IDs
        if (c.isGroup && c.members) {
          c.members.forEach((m) => allUserIds.add(m.id));
        }
      });
      
      const otherUserIds = Array.from(allUserIds).filter(Boolean);
      let presenceMap: Record<string, boolean> = {};

      // Seed from socket snapshot first (may already be populated)
      presenceSnapshotRef.current.forEach((id) => { presenceMap[String(id)] = true; });

      if (otherUserIds.length > 0) {
        try {
          const presenceList = await apiRequest<{ userId: string; isOnline: boolean }[]>(
            '/user/presence/batch',
            { method: 'POST', body: JSON.stringify({ userIds: otherUserIds }) },
          );
          // REST result is authoritative — overwrite snapshot values
          presenceList.forEach((p) => { presenceMap[String(p.userId)] = p.isOnline; });
        } catch {
          // REST failed — socket snapshot values remain as fallback
        }
      }

      const enrichedConvs = convs.map((c) => {
        const enriched = {
          ...c,
          user: { ...c.user, isOnline: presenceMap[String(c.user.id)] ?? false },
        };
        
        // Update member online status for groups
        if (c.isGroup && c.members) {
          enriched.members = c.members.map((m) => ({
            ...m,
            isOnline: presenceMap[String(m.id)] ?? false,
          }));
        }
        
        return enriched;
      });

      setRoomIdMap(map);
      setConversations(enrichedConvs);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setLoadRoomError('Could not load conversations. Check your connection and try again.');
      if (!silent) {
        setConversations([]);
        setMessagesMap({});
        setActiveConversation(null);
      }
    } finally {
      setIsLoadingRooms(false);
    }
  };

  // Keep ref always pointing at the latest refreshRooms
  refreshRoomsRef.current = refreshRooms;

  // ── Load Messages ────────────────────────────────────────────────────────
  const loadMessages = async (conv: Conversation, silent = false) => {
    const roomId = conv.roomId || roomIdMapRef.current[conv.user.id];
    if (!roomId || !user) return;

    if (!silent) setIsLoadingMessages(true);
    try {
      const data = await apiRequest<{ messages: any[] }>(`/rooms/${roomId}/messages`);
      const msgs: Message[] = (data.messages || []).map((m: any) => {
        const senderId = m.senderId || m.sender_id || m.userId;
        const rawDate = m.createdAt ? new Date(m.createdAt) : new Date();
        return {
          id: m._id || m.id,
          senderId,
          recipientId: m.recipientId || (senderId === user.id ? conv.user.id : user.id),
          content: m.content,
          fileUrl: m.isDeleted ? undefined : m.fileUrl,
          messageType: m.messageType || 'text',
          createdAt: rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawCreatedAt: rawDate.toISOString(),
          status: 'read',
          isDeleted: m.isDeleted === true,
          isEdited: m.isEdited === true,
        };
      });
      setMessagesMap((prev) => ({ ...prev, [conv.user.id]: msgs }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // ── Edit & Delete message methods (immediate UI update) ───────────────────
  const deleteMessage = async (messageId: string) => {
    if (!activeConversation || !user) return;
    const roomId = activeConversation.roomId || roomIdMapRef.current[activeConversation.user.id];
    if (!roomId) return;

    // Optimistically update message in state immediately so UI reflects without refresh
    setMessagesMap((prev) => {
      const current = prev[activeConversation.user.id] || [];
      return {
        ...prev,
        [activeConversation.user.id]: current.map((m) =>
          m.id === messageId
            ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: undefined }
            : m,
        ),
      };
    });

    try {
      await apiRequest(`/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete message:', err);
      loadMessages(activeConversation, true);
      throw err;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation || !user) return;
    const roomId = activeConversation.roomId || roomIdMapRef.current[activeConversation.user.id];
    if (!roomId) return;

    // Optimistically update message in state immediately
    setMessagesMap((prev) => {
      const current = prev[activeConversation.user.id] || [];
      return {
        ...prev,
        [activeConversation.user.id]: current.map((m) =>
          m.id === messageId ? { ...m, isEdited: true, content: newContent } : m,
        ),
      };
    });

    try {
      await apiRequest(`/rooms/${roomId}/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent }),
      });
    } catch (err) {
      console.error('Failed to edit message:', err);
      loadMessages(activeConversation, true);
      throw err;
    }
  };

  // ── Listen for message refresh events (edit/delete) ──────────────────────
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[ChatContext] chat:refresh-messages event received');
      if (activeConversation && user) {
        loadMessages(activeConversation, true);
      }
    };

    window.addEventListener('chat:refresh-messages', handleRefresh);
    return () => window.removeEventListener('chat:refresh-messages', handleRefresh);
  }, [activeConversation?.user.id, user?.id]);

  // ── Initial data load & blocked users ───────────────────────────────────
  useEffect(() => {
    if (user) {
      refreshRooms();
      apiRequest<string[]>('/user/blocked-users')
        .then((list) => { if (Array.isArray(list)) setBlockedUserIds(list); })
        .catch(() => {});
    } else {
      setConversations(DEMO_CONVERSATIONS);
      setMessagesMap(DEMO_MESSAGES);
    }
  }, [user?.id]);

  // ── Socket connection — connect when logged in, disconnect on logout ─────
  useEffect(() => {
    // Clean up any previous socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
    }

    // Never run on the server — socket.io-client is browser-only
    if (typeof window === 'undefined' || !user) return;

    // Track whether this effect's cleanup ran before the dynamic import resolved
    let cancelled = false;

    // Dynamic import keeps socket.io-client out of the SSR bundle entirely
    import('socket.io-client').then(({ io }) => {
      // Guard: effect may have been cleaned up before the import resolved
      if (cancelled || !user) return;

      const socket = io(GATEWAY_URL, {
        // The jwt httpOnly cookie is sent automatically by the browser when
        // withCredentials is true — no manual token handling needed on the client.
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      // ── Connection lifecycle ───────────────────────────────────────────
      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id, 'userId:', user?.id);
        setIsSocketConnected(true);
        
        // Join all group rooms
        console.log('[Socket] Joining group rooms...');
        conversationsRef.current.forEach((conv) => {
          if (conv.isGroup && conv.roomId) {
            socket.emit('join_room', { roomId: conv.roomId });
            console.log('[Socket] Joined group room:', conv.roomId);
          }
        });
        
        // Re-fetch presence 4s after connecting — gives other tabs time to connect
        setTimeout(() => {
          console.log('[Socket] Triggering delayed refreshRooms after connect');
          refreshRoomsRef.current(true);
        }, 4000);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason, 'userId:', user?.id);
        setIsSocketConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message, 'userId:', user?.id);
        setIsSocketConnected(false);
      });

      // ── Presence: green-dot updates ────────────────────────────────────
      // Payload: { userId: string; status: 'online' | 'offline'; lastSeen?: Date }
      socket.on(
        'user_status_changed',
        (payload: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
          const isOnline = payload.status === 'online';
          console.log('[Socket] user_status_changed:', payload.userId, payload.status);

          const targetId = String(payload.userId);

          // Keep snapshot ref in sync
          if (isOnline) {
            presenceSnapshotRef.current.add(targetId);
          } else {
            presenceSnapshotRef.current.delete(targetId);
            setTypingUsers((prev) => ({ ...prev, [targetId]: false }));
            if (typingTimeoutsRef.current[targetId]) {
              clearTimeout(typingTimeoutsRef.current[targetId]);
              delete typingTimeoutsRef.current[targetId];
            }
          }

          // Update conversations - both direct chats and group members
          setConversations((prev) =>
            prev.map((c) => {
              // Update if this is a direct chat with this user
              if (String(c.user.id) === targetId) {
                return { ...c, user: { ...c.user, isOnline } };
              }
              
              // Update if this user is a member of a group
              if (c.isGroup && c.members) {
                const updatedMembers = c.members.map((m) =>
                  String(m.id) === targetId ? { ...m, isOnline } : m
                );
                return { ...c, members: updatedMembers };
              }
              
              return c;
            }),
          );
          
          // Update active conversation
          setActiveConversation((prev) => {
            if (!prev) return prev;
            
            // If it's a direct chat with this user
            if (String(prev.user.id) === targetId) {
              return { ...prev, user: { ...prev.user, isOnline } };
            }
            
            // If it's a group and this user is a member
            if (prev.isGroup && prev.members) {
              const updatedMembers = prev.members.map((m) =>
                String(m.id) === targetId ? { ...m, isOnline } : m
              );
              return { ...prev, members: updatedMembers };
            }
            
            return prev;
          });
        },
      );

      // ── Presence snapshot — sent by the server on first connect ────────
      socket.on('presence_snapshot', (payload: { onlineUserIds: string[] }) => {
        console.log('[Socket] presence_snapshot received:', payload.onlineUserIds);

        const onlineSet = new Set((payload.onlineUserIds || []).map(String));
        presenceSnapshotRef.current = onlineSet;

        // Apply immediately to any conversations already in state
        setConversations((prev) => {
          if (prev.length === 0) return prev;
          return prev.map((c) => {
            const updated = {
              ...c,
              user: { ...c.user, isOnline: onlineSet.has(String(c.user.id)) },
            };
            
            // Update group members' online status
            if (c.isGroup && c.members) {
              updated.members = c.members.map((m) => ({
                ...m,
                isOnline: onlineSet.has(String(m.id)),
              }));
            }
            
            return updated;
          });
        });
        
        setActiveConversation((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            user: { ...prev.user, isOnline: onlineSet.has(String(prev.user.id)) },
          };
          
          // Update group members' online status in active conversation
          if (prev.isGroup && prev.members) {
            updated.members = prev.members.map((m) => ({
              ...m,
              isOnline: onlineSet.has(String(m.id)),
            }));
          }
          
          return updated;
        });
      });

      // ── Typing indicators ──────────────────────────────────────────────
      socket.on(
        'user_typing',
        (payload: { userId: string; roomId?: string; isTyping: boolean }) => {
          console.log('[Socket] user_typing received:', payload);
          setTypingUsers((prev) => ({
            ...prev,
            [payload.userId]: payload.isTyping,
          }));

          if (payload.isTyping) {
            if (typingTimeoutsRef.current[payload.userId]) {
              clearTimeout(typingTimeoutsRef.current[payload.userId]);
            }
            typingTimeoutsRef.current[payload.userId] = setTimeout(() => {
              setTypingUsers((prev) => ({
                ...prev,
                [payload.userId]: false,
              }));
            }, 3500);
          } else {
            if (typingTimeoutsRef.current[payload.userId]) {
              clearTimeout(typingTimeoutsRef.current[payload.userId]);
              delete typingTimeoutsRef.current[payload.userId];
            }
          }
        },
      );

      // ── Incoming messages ──────────────────────────────────────────────
      // Only receivers get this event — the sender uses the optimistic message.
      const handleNewMessage = (payload: {
        roomId: string;
        message: { id: string; senderId: string; content: string; fileUrl?: string; messageType?: string; createdAt: string };
      }) => {
        console.log('[Socket] new_message received:', {
          roomId: payload.roomId,
          messageId: payload.message.id,
          senderId: payload.message.senderId,
          content: payload.message.content.substring(0, 30),
          myId: user.id,
        });

        // Clear typing indicator for sender
        setTypingUsers((prev) => ({
          ...prev,
          [payload.message.senderId]: false,
        }));
        if (typingTimeoutsRef.current[payload.message.senderId]) {
          clearTimeout(typingTimeoutsRef.current[payload.message.senderId]);
          delete typingTimeoutsRef.current[payload.message.senderId];
        }

        const conv = conversationsRef.current.find((c) => c.roomId === payload.roomId);
        if (!conv) {
          console.warn('[Socket] new_message: roomId not found in conversations:', payload.roomId);
          return;
        }
        console.log('[Socket] new_message: matched conversation with user:', conv.user.id, conv.user.name);

        const createdAt = payload.message.createdAt
          ? new Date(payload.message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        const msg: Message = {
          id: payload.message.id,
          senderId: payload.message.senderId,
          recipientId: user.id,
          content: payload.message.content,
          fileUrl: payload.message.fileUrl,
          messageType: (payload.message.messageType as any) || 'text',
          createdAt,
          rawCreatedAt: payload.message.createdAt || new Date().toISOString(),
          status: 'delivered',
        };

        // Append, deduplicating by id
        setMessagesMap((prev) => {
          const existing = prev[conv.user.id] || [];
          const isDuplicate = existing.some((m) => m.id === msg.id);
          console.log('[Socket] new_message: updating messagesMap for userId:', conv.user.id, 'duplicate?', isDuplicate, 'existing count:', existing.length);
          if (isDuplicate) {
            console.log('[Socket] new_message: Duplicate detected, skipping update');
            return prev;
          }
          const updated = { ...prev, [conv.user.id]: [...existing, msg] };
          console.log('[Socket] new_message: Added message, new count:', updated[conv.user.id].length);
          return updated;
        });

        setConversations((prev) =>
          prev.map((c) =>
            c.roomId === payload.roomId
              ? {
                  ...c,
                  lastMessage: {
                    content: payload.message.content,
                    timestamp: createdAt,
                    senderId: payload.message.senderId,
                  },
                  unreadCount:
                    activeConversationRef.current?.roomId === payload.roomId
                      ? 0
                      : (c.unreadCount ?? 0) + 1,
                }
              : c,
          ),
        );

        // If the active conversation is with this sender, immediately mark read!
        if (activeConversationRef.current?.roomId === payload.roomId && socketRef.current) {
          socketRef.current.emit('mark_read', {
            recipientId: payload.message.senderId,
            roomId: payload.roomId,
          });
        }
      };

      socket.on('new_message', handleNewMessage);

      // ── Read Receipts ──────────────────────────────────────────────────
      socket.on('messages_read', (payload: { userId: string; roomId?: string }) => {
        console.log('[Socket] messages_read received from userId:', payload.userId);
        const targetUserId = String(payload.userId);

        setMessagesMap((prev) => {
          const userMsgs = prev[targetUserId];
          if (!userMsgs) return prev;
          const updated = userMsgs.map((m) => ({ ...m, status: 'read' as const }));
          return { ...prev, [targetUserId]: updated };
        });
      });

      // ── Group Events ────────────────────────────────────────────────────
      
      // When members are added to a group
      socket.on('member_added', (payload: { roomId: string; addedBy: string; members: any[]; room?: any }) => {
        console.log('[Socket] member_added:', payload);
        
        // Refresh rooms to get updated member list
        refreshRoomsRef.current(true);
        
        // If this is the active conversation, reload messages
        if (activeConversationRef.current?.roomId === payload.roomId) {
          const conv = activeConversationRef.current;
          setTimeout(() => loadMessages(conv, true), 500);
        }
      });

      // When a member is removed or leaves a group
      socket.on('member_removed', (payload: { roomId: string; userId: string; removedBy: string }) => {
        console.log('[Socket] member_removed:', payload);
        
        // If current user was removed, clear active conversation if it's this group
        if (payload.userId === user.id) {
          setActiveConversation((prev) => {
            if (prev?.roomId === payload.roomId) return null;
            return prev;
          });
          
          // Remove from conversations list
          setConversations((prev) => prev.filter((c) => c.roomId !== payload.roomId));
        } else {
          // Another user was removed, just refresh to update member count
          refreshRoomsRef.current(true);
          
          // If this is the active conversation, reload to update member list
          if (activeConversationRef.current?.roomId === payload.roomId) {
            const conv = activeConversationRef.current;
            setTimeout(() => loadMessages(conv, true), 500);
          }
        }
      });

      // When group info is updated
      socket.on('group_updated', (payload: { roomId: string; updatedBy: string; updates: any; room?: any }) => {
        console.log('[Socket] group_updated:', payload);
        
        // Update conversation in list
        setConversations((prev) =>
          prev.map((c) => {
            if (c.roomId !== payload.roomId) return c;
            return {
              ...c,
              user: {
                ...c.user,
                name: payload.updates.name ?? c.user.name,
                bio: payload.updates.description ?? c.user.bio,
                profile_picture: payload.updates.group_picture ?? c.user.profile_picture,
              },
            };
          }),
        );
        
        // Update active conversation if it's this group
        setActiveConversation((prev) => {
          if (!prev || prev.roomId !== payload.roomId) return prev;
          return {
            ...prev,
            user: {
              ...prev.user,
              name: payload.updates.name ?? prev.user.name,
              bio: payload.updates.description ?? prev.user.bio,
              profile_picture: payload.updates.group_picture ?? prev.user.profile_picture,
            },
          };
        });
      });

      // When a new group is created (and current user is added)
      socket.on('group_created', (payload: { roomId: string; room: any; createdBy: string }) => {
        console.log('[Socket] group_created:', payload);
        
        // Refresh rooms to show the new group
        refreshRoomsRef.current(true);
      });
    });

    return () => {
      cancelled = true;
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsSocketConnected(false);
    };
  }, [user?.id]); // reconnect only when the logged-in user changes

  // ── Select conversation ──────────────────────────────────────────────────
  const selectConversation = (conversation: Conversation | null) => {
    if (!conversation) {
      setActiveConversation(null);
      return;
    }
    // Pick freshest version from state so presence and metadata are completely up to date
    const fresh = conversationsRef.current.find((c) => c.user.id === conversation.user.id) || conversation;
    setActiveConversation(fresh);
    setConversations((prev) =>
      prev.map((c) => (c.user.id === fresh.user.id ? { ...c, unreadCount: 0 } : c)),
    );
    if (user) {
      loadMessages(fresh);
      if (socketRef.current) {
        socketRef.current.emit('mark_read', {
          recipientId: fresh.user.id,
          roomId: fresh.roomId || roomIdMapRef.current[fresh.user.id],
        });
      }
    }
  };

  // ── Send typing indicator ────────────────────────────────────────────────
  const sendTyping = (isTyping: boolean) => {
    if (!socketRef.current || !activeConversation || !user) return;
    const recipientId = activeConversation.user.id;
    const roomId = activeConversation.roomId || roomIdMapRef.current[recipientId];
    socketRef.current.emit(isTyping ? 'typing_start' : 'typing_stop', {
      recipientId,
      roomId,
    });
  };

  // ── Send message ─────────────────────────────────────────────────────────
  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (content: string, fileUrl?: string, messageType?: string) => {
    if (!activeConversation || (!content.trim() && !fileUrl)) return;
    if (!user) return;

    sendTyping(false);

    const myId = user.id;
    const nowDate = new Date();
    const now = nowDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = `temp-${Date.now()}`;

    const optimisticMsg: Message = {
      id: tempId,
      senderId: myId,
      recipientId: activeConversation.user.id,
      content: content.trim(),
      fileUrl,
      messageType: (messageType as any) || (fileUrl ? 'image' : 'text'),
      createdAt: now,
      rawCreatedAt: nowDate.toISOString(),
      status: 'sent',
    };

    // Add optimistic message — the socket will NOT echo back to the sender
    setMessagesMap((prev) => ({
      ...prev,
      [activeConversation.user.id]: [...(prev[activeConversation.user.id] || []), optimisticMsg],
    }));

    const snippetText = fileUrl ? (messageType === 'video' ? '📹 Video' : '📷 Photo') : content.trim();

    // Update sidebar immediately for the sender
    setConversations((prev) =>
      prev.map((c) =>
        c.user.id === activeConversation.user.id
          ? { ...c, lastMessage: { content: snippetText, timestamp: now, senderId: myId } }
          : c,
      ),
    );

    const roomId = activeConversation.roomId || roomIdMapRef.current[activeConversation.user.id];
    if (roomId) {
      try {
        await apiRequest(`/rooms/${roomId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: content.trim(),
            fileUrl,
            messageType: messageType || (fileUrl ? 'image' : 'text'),
          }),
        });

        // Update optimistic message status from 'sent' to 'delivered'
        setMessagesMap((prev) => ({
          ...prev,
          [activeConversation.user.id]: (prev[activeConversation.user.id] || []).map((m) =>
            m.id === tempId ? { ...m, status: 'delivered' } : m,
          ),
        }));
      } catch (err) {
        console.error('[SendMessage] Failed:', err);
        // Roll back the optimistic message on failure
        setMessagesMap((prev) => ({
          ...prev,
          [activeConversation.user.id]: (prev[activeConversation.user.id] || []).filter(
            (m) => m.id !== tempId,
          ),
        }));
      }
    }
  };

  // ── Start direct chat ─────────────────────────────────────────────────────
  const startDirectChat = async (targetUserId: string, targetUser: User) => {
    if (!user) return;

    const existingRoomId = roomIdMapRef.current[targetUserId];
    if (existingRoomId) {
      const existingConv = conversationsRef.current.find((c) => c.user.id === targetUserId);
      if (existingConv) { selectConversation(existingConv); return; }
    }

    try {
      const result = await apiRequest<any>('/rooms/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });

      const roomId = result.room?.id;
      if (roomId) {
        setRoomIdMap((prev) => ({ ...prev, [targetUserId]: roomId }));
        const isSelf = targetUserId === user.id;
        const newConv: Conversation = {
          user: isSelf ? { ...targetUser, name: 'Saved Messages' } : targetUser,
          unreadCount: 0,
          roomId,
          isSelfRoom: isSelf || result.room?.isSelfRoom === true,
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

  // ── Block / Unblock ───────────────────────────────────────────────────────
  const blockUser = async (userId: string) => {
    try {
      if (user) await apiRequest(`/user/${userId}/block`, { method: 'POST' });
      setBlockedUserIds((prev) => [...prev, userId]);
      setConversations((prev) =>
        prev.map((c) => (c.user.id === userId ? { ...c, isBlocked: true } : c)),
      );
      setActiveConversation((prev) =>
        prev && prev.user.id === userId ? { ...prev, isBlocked: true } : prev,
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
      setActiveConversation((prev) =>
        prev && prev.user.id === userId ? { ...prev, isBlocked: false } : prev,
      );
    } catch (err) { console.error('Failed to unblock user', err); }
  };

  // ── Archive helpers ───────────────────────────────────────────────────────
  const archiveConversation = (userId: string) => {
    setArchivedConversationIds((prev) => {
      const next = prev.includes(userId) ? prev : [...prev, userId];
      try { localStorage.setItem('archived_conv_ids', JSON.stringify(next)); } catch {}
      return next;
    });
    // If this was the active conversation, clear it
    setActiveConversation((prev) => (prev?.user.id === userId ? null : prev));
  };

  const unarchiveConversation = (userId: string) => {
    setArchivedConversationIds((prev) => {
      const next = prev.filter((id) => id !== userId);
      try { localStorage.setItem('archived_conv_ids', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Filter conversations ──────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isBlocked = blockedUserIds.includes(c.user.id) || c.isBlocked;
    const isArchived = archivedConversationIds.includes(c.user.id);
    if (activeTab === 'archived') return isArchived && matchesSearch;
    if (isArchived) return false;  // hide archived from other tabs
    if (activeTab === 'blocked') return isBlocked && matchesSearch;
    if (isBlocked) return false;
    if (activeTab === 'unread') return c.unreadCount > 0 && matchesSearch;
    return matchesSearch;
  });

  // Compute active messages — recalculate when messagesMap or activeConversation changes
  const activeMessages = React.useMemo(() => {
    if (!activeConversation) return [];
    const msgs = messagesMap[activeConversation.user.id] || [];
    console.log('[ChatContext] activeMessages recalculated:', {
      conversationUserId: activeConversation.user.id,
      messageCount: msgs.length,
      messagesMapKeys: Object.keys(messagesMap),
    });
    return msgs;
  }, [messagesMap, activeConversation?.user.id]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages: activeMessages,
        activeTab,
        searchQuery,
        blockedUserIds,
        archivedConversationIds,
        isLoadingRooms,
        isLoadingMessages,
        isSocketConnected,
        loadRoomError,
        typingUsers,
        sendTyping,
        setActiveTab,
        setSearchQuery,
        selectConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        startDirectChat,
        blockUser,
        unblockUser,
        archiveConversation,
        unarchiveConversation,
        filteredConversations,
        refreshRooms,
        refreshRoomsRef,
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
