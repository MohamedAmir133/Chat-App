import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  X,
  Image as ImageIcon,
  Film,
  Search,
  AlertCircle,
  RotateCcw,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { Message, User } from '@/types';
import { apiRequest } from '@/lib/api';

// Emoji categories
const EMOJI_CATEGORIES = [
  { id: 'smileys', label: '😀', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😴', '😷', '🤯', '😎', '🥳', '🤩'] },
  { id: 'hearts', label: '❤️', emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👊', '✊', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '🖐️', '👌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '⭐', '🌟', '💯'] },
  { id: 'nature', label: '🚀', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🦄', '🐝', '🐛', '🦋', '🌸', '🌺', '🌻', '🌹', '🍀', '🌴', '🌲', '☀️', '🌙', '⭐', '🌈', '⚡', '❄️', '🔥', '🌊'] },
  { id: 'food', label: '🍕', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍓', '🍇', '🍒', '🍑', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆', '🥦', '🌽', '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🍣', '🍱', '🍦', '🍩', '🍰', '🎂', '☕', '🍺', '🍷', '🍹', '🍾'] },
  { id: 'objects', label: '🎉', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🥊', '🎨', '🎬', '🎤', '🎧', '🎷', '🎸', '🎹', '🎮', '🚗', '🚕', '🚙', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚀', '🛸', '🛰️', '⏰', '📱', '💻', '📷', '💡', '💰', '🎁', '🎈', '🎉', '🏆', '💎'] },
];

const CLOUDINARY_CLOUD_NAME = 'eiiksdvw';
const CLOUDINARY_UPLOAD_PRESET = 'LAST dANCE';

async function uploadFileToCloud(file: File): Promise<{ url: string; isVideo: boolean }> {
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'chat-app-media');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: formData },
    );

    if (response.ok) {
      const data = await response.json();
      return { url: data.secure_url, isVideo };
    }
  } catch (err) {
    console.warn('Cloudinary upload failed, using Data URL fallback:', err);
  }

  // Data URL fallback if offline or cloud unavailable
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string, isVideo });
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function ChatView({ onViewProfile }: { onViewProfile?: (user: User) => void }) {
  const { user: currentUser } = useAuth();
  const {
    activeConversation,
    selectConversation,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    blockUser,
    unblockUser,
    blockedUserIds,
    isLoadingMessages,
    typingUsers,
    sendTyping,
  } = useChat();
  const toast = useToast();
  const confirm = useConfirm();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Edit / Delete state
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [actionMsgId, setActionMsgId] = useState<string | null>(null); // open "..." menu

  // Emoji Picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);

  // In-chat search state
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Media attachment state
  const [mediaPreview, setMediaPreview] = useState<{ url: string; isVideo: boolean; file: File } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<{ msg: Message | null; text: string; fileUrl?: string; fileType?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track whether the user is near the bottom of the feed
  const isNearBottomRef = useRef<boolean>(true);

  const isBlocked =
    activeConversation &&
    (blockedUserIds.includes(activeConversation.user.id) || activeConversation.isBlocked);

  const isPartnerTyping = !!(activeConversation && typingUsers[activeConversation.user.id]);

  useEffect(() => {
    // When conversation changes, immediately jump to bottom
    isNearBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      sendTyping(false);
    };
  }, [activeConversation?.user.id]);

  // Only scroll to bottom if the viewer is already near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPartnerTyping, mediaPreview]);

  // Close dropdown / emoji picker on outside click
  useEffect(() => {
    const handler = () => {
      setShowOptions(false);
      setShowEmojiPicker(false);
      setActionMsgId(null);
    };
    if (showOptions || showEmojiPicker || actionMsgId) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showOptions, showEmojiPicker, actionMsgId]);

  if (!activeConversation) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (!val.trim()) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      sendTyping(false);
      return;
    }

    sendTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
      typingTimerRef.current = null;
    }, 2000);
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    textInputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`File size exceeds the 20MB limit. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const localUrl = URL.createObjectURL(file);
    setMediaPreview({ url: localUrl, isVideo, file });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent, retryContent?: string, retryFileUrl?: string, retryFileType?: string) => {
    e.preventDefault();
    const content = retryContent ?? inputMessage.trim();
    const currentMediaPreview = retryContent ? null : mediaPreview;
    if ((!content && !currentMediaPreview && !retryFileUrl) || isBlocked || isSending || isUploadingMedia) return;

    setSendError(null);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    sendTyping(false);

    setIsSending(true);
    let uploadedUrl: string | undefined = retryFileUrl;
    let messageType: string | undefined = retryFileType;

    try {
      if (currentMediaPreview && !retryFileUrl) {
        setIsUploadingMedia(true);
        const uploadRes = await uploadFileToCloud(currentMediaPreview.file);
        uploadedUrl = uploadRes.url;
        messageType = uploadRes.isVideo ? 'video' : 'image';
      }

      setInputMessage('');
      setMediaPreview(null);
      setShowEmojiPicker(false);

      await sendMessage(content, uploadedUrl, messageType);
    } catch (err) {
      console.error('Failed to send message:', err);
      setSendError({
        msg: null,
        text: content,
        fileUrl: uploadedUrl,
        fileType: messageType,
      });
    } finally {
      setIsSending(false);
      setIsUploadingMedia(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  // ─── Edit / Delete handlers ────────────────────────────────────────────────
  const handleEditStart = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content || '');
    setActionMsgId(null);
  };

  const handleEditSave = async (roomId: string, messageId: string) => {
    if (!editContent.trim()) return;
    try {
      await editMessage(messageId, editContent.trim());
      toast.success('Message updated');
    } catch (err) {
      console.error('Failed to edit message:', err);
      toast.error('Failed to edit message');
    } finally {
      setEditingMsgId(null);
      setEditContent('');
    }
  };

  const handleEditCancel = () => {
    setEditingMsgId(null);
    setEditContent('');
  };

  const handleDelete = async (roomId: string, messageId: string) => {
    setActionMsgId(null);
    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? It will be removed for all members in this conversation.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error('Failed to delete message');
    }
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation.user.name)}&background=FF5A36&color=fff&size=150`;
  const isSelfRoom = activeConversation.isSelfRoom === true || (!!currentUser && activeConversation.user.id === currentUser.id);
  const isGroup = activeConversation.isGroup === true;

  return (
    <div style={styles.container}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            onClick={() => selectConversation(null)}
            className="mobile-back-btn"
            style={styles.mobileBackBtn}
            title="Back to conversations"
          >
            <ArrowLeft size={18} color="#1C2024" />
          </button>
          <div
            style={{ ...styles.userInfo, cursor: (isSelfRoom || isGroup) ? (isGroup ? 'pointer' : 'default') : 'pointer' }}
            onClick={() => {
              if (isSelfRoom) return;
              if (isGroup) {
                onViewProfile?.(activeConversation.user);
              } else {
                onViewProfile?.(activeConversation.user);
              }
            }}
            title={isSelfRoom ? 'Saved Messages' : isGroup ? 'View group info' : `View ${activeConversation.user.name}'s profile`}
          >
          <div style={styles.avatarWrap}>
            {isSelfRoom ? (
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6F43, #FF4D29)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '20px' }}>🔖</span>
              </div>
            ) : isGroup ? (
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeConversation.user.profile_picture ? (
                  <img
                    src={activeConversation.user.profile_picture}
                    alt={activeConversation.user.name}
                    style={styles.avatarImg}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>👥</span>
                )}
              </div>
            ) : (
              <>
                <img
                  src={activeConversation.user.profile_picture || fallbackAvatar}
                  alt={activeConversation.user.name}
                  style={styles.avatarImg}
                />
                {activeConversation.user.isOnline && <span style={styles.onlineDot} />}
              </>
            )}
          </div>

          <div>
            <h3 style={{ ...styles.userName, textDecoration: 'none' }}>
              {isSelfRoom ? 'Saved Messages' : activeConversation.user.name}
              {isGroup && activeConversation.memberCount && (
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#888', marginLeft: '8px' }}>
                  ({activeConversation.memberCount} members)
                </span>
              )}
            </h3>
            <p style={styles.userStatus}>
              {isSelfRoom ? (
                <span style={{ color: '#8A94A6' }}>Your personal notepad</span>
              ) : isGroup ? (
                <span style={{ color: '#22C55E' }}>
                  {(() => {
                    const onlineCount = activeConversation.members?.filter(m => m.isOnline).length || 0;
                    return onlineCount > 0 
                      ? `● ${onlineCount} ${onlineCount === 1 ? 'member' : 'members'} active`
                      : 'No members active';
                  })()}
                </span>
              ) : isPartnerTyping ? (
                <span style={{ color: '#FF5A36', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>typing</span>
                  <span className="typing-dots-container">
                    <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '4px', height: '4px' }} />
                    <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '4px', height: '4px' }} />
                    <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '4px', height: '4px' }} />
                  </span>
                </span>
              ) : activeConversation.user.isOnline ? (
                <span style={{ color: '#22C55E' }}>● Active now</span>
              ) : (
                <span style={{ color: '#9BA3AF' }}>Offline</span>
              )}
            </p>
          </div>
        </div>
        </div>

        {/* Actions */}
        <div style={styles.headerActions}>
          <button
            onClick={() => {
              if (showChatSearch && chatSearch) setChatSearch('');
              setShowChatSearch(!showChatSearch);
            }}
            style={{
              ...styles.iconBtn,
              backgroundColor: showChatSearch ? '#FFF0EB' : '#F5F6F8',
            }}
            title="Search messages in this conversation"
          >
            <Search size={18} color={showChatSearch ? '#FF5A36' : '#737D8C'} />
          </button>

          {/* Block/Unblock only for non-self rooms */}
          {!isSelfRoom && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                style={styles.iconBtn}
                title="More options"
              >
                <MoreVertical size={18} color="#737D8C" />
              </button>

              {showOptions && (
                <div style={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                  {isBlocked ? (
                    <button
                      onClick={() => { unblockUser(activeConversation.user.id); setShowOptions(false); }}
                      style={styles.dropdownItem}
                    >
                      <ShieldCheck size={16} color="#22C55E" />
                      <span>Unblock User</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { blockUser(activeConversation.user.id); setShowOptions(false); }}
                      style={{ ...styles.dropdownItem, color: '#EF4444' }}
                    >
                      <ShieldAlert size={16} color="#EF4444" />
                      <span>Block User</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showChatSearch && (
        <div style={styles.chatSearchBar}>
          <Search size={15} color="#8A94A6" style={{ marginRight: '8px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            style={styles.chatSearchInput}
            autoFocus
          />
          {chatSearch && (
            <button
              onClick={() => setChatSearch('')}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={14} color="#737D8C" />
            </button>
          )}
        </div>
      )}

      {/* ── Message Feed ─────────────────────────────────────── */}
      <div
        ref={feedRef}
        style={styles.feed}
        onScroll={() => {
          const el = feedRef.current;
          if (!el) return;
          isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
        }}
      >
        {isLoadingMessages ? (
          <div style={styles.loadingState}>
            <Loader2 size={28} color="#FF5A36" style={styles.spinner} />
            <p style={styles.loadingText}>Loading messages...</p>
          </div>
        ) : (() => {
          const filtered = chatSearch.trim()
            ? messages.filter((m) => m.content?.toLowerCase().includes(chatSearch.trim().toLowerCase()))
            : messages;

          if (filtered.length === 0) {
            return (
              <div style={styles.emptyMessages}>
                {chatSearch ? (
                  <>
                    <p style={styles.emptyTitle}>No messages matched</p>
                    <p style={styles.emptySubtitle}>No messages contained "{chatSearch}"</p>
                  </>
                ) : isSelfRoom ? (
                  <>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔖</div>
                    <p style={styles.emptyTitle}>Your Saved Messages</p>
                    <p style={styles.emptySubtitle}>Send yourself notes, links, reminders — anything you want to keep handy.</p>
                  </>
                ) : (
                  <>
                    <p style={styles.emptyTitle}>No messages yet</p>
                    <p style={styles.emptySubtitle}>Say hello to start the conversation! 👋</p>
                  </>
                )}
              </div>
            );
          }

          // Build message list with date separators
          const items: React.ReactNode[] = [];
          let lastDateLabel = '';

          const getDateLabel = (rawISO?: string): string => {
            if (!rawISO) return '';
            const d = new Date(rawISO);
            if (isNaN(d.getTime())) return '';
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const sameDay = (a: Date, b: Date) =>
              a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
            if (sameDay(d, today)) return 'Today';
            if (sameDay(d, yesterday)) return 'Yesterday';
            return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          };

          filtered.forEach((msg) => {
            const dateLabel = getDateLabel(msg.rawCreatedAt);
            if (dateLabel && dateLabel !== lastDateLabel) {
              lastDateLabel = dateLabel;
              items.push(
                <div key={`sep-${dateLabel}`} style={styles.dateSeparator}>
                  <span style={styles.dateSeparatorLine} />
                  <span style={styles.dateSeparatorChip}>{dateLabel}</span>
                  <span style={styles.dateSeparatorLine} />
                </div>
              );
            }

            const isMe =
              msg.senderId === currentUser?.id ||
              msg.senderId === 'me' ||
              msg.id?.startsWith('temp-');

            // Get sender info for group messages
            const senderInfo = isGroup && !isMe && activeConversation.members
              ? activeConversation.members.find(m => m.id === msg.senderId)
              : null;
            
            const senderName = senderInfo?.name || 'Unknown User';
            const senderAvatar = senderInfo?.profile_picture || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=FF5A36&color=fff&size=64`;

            const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation.user.name)}&background=FF5A36&color=fff&size=64`;

            const hasMedia = !!msg.fileUrl;
            const isVideoMsg = msg.messageType === 'video' || (msg.fileUrl && (msg.fileUrl.endsWith('.mp4') || msg.fileUrl.endsWith('.webm') || msg.fileUrl.includes('/video/upload/')));

            const roomId = activeConversation.roomId || '';
            const isEditing = editingMsgId === msg.id;

            items.push(
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  gap: '8px',
                  maxWidth: '75%',
                  width: 'fit-content',
                  marginLeft: isMe ? 'auto' : '0',
                  marginRight: isMe ? '0' : 'auto',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => { if (actionMsgId !== msg.id) setHoveredMsgId(null); }}
              >
                {!isMe && !isSelfRoom && (
                  <img
                    src={isGroup ? senderAvatar : (activeConversation.user.profile_picture || fallback)}
                    alt={isGroup ? senderName : activeConversation.user.name}
                    style={{ ...styles.msgAvatar, cursor: 'pointer' }}
                    onClick={() => {
                      if (isGroup && senderInfo) {
                        onViewProfile?.(senderInfo as any);
                      } else {
                        onViewProfile?.(activeConversation.user);
                      }
                    }}
                    title={isGroup ? `View ${senderName}'s profile` : `View ${activeConversation.user.name}'s profile`}
                  />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: '4px', maxWidth: '100%' }}>
                  
                  {/* Sender name for group messages (only for others' messages) */}
                  {isGroup && !isMe && (
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: '#737D8C', 
                      marginLeft: '4px',
                      marginBottom: '-2px'
                    }}>
                      {senderName}
                    </span>
                  )}

                  {/* ── Message bubble + action button ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isMe ? 'row-reverse' : 'row' }}>

                    {/* "..." action button — only for own messages, on hover, not deleted */}
                    {isMe && !isEditing && !msg.isDeleted && !msg.id?.startsWith('temp-') && (hoveredMsgId === msg.id || actionMsgId === msg.id) && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionMsgId(actionMsgId === msg.id ? null : msg.id); }}
                          style={styles.msgActionBtn}
                          title="Message options"
                        >
                          <MoreVertical size={14} color="#737D8C" />
                        </button>

                        {/* Dropdown */}
                        {actionMsgId === msg.id && (
                          <div
                            style={{ ...styles.msgDropdown, [isMe ? 'right' : 'left']: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Edit — only text messages */}
                            {!hasMedia && (
                              <button
                                onClick={() => handleEditStart(msg)}
                                style={styles.msgDropdownItem}
                              >
                                <Pencil size={14} color="#3B82F6" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(roomId, msg.id)}
                              style={{ ...styles.msgDropdownItem, color: '#EF4444' }}
                            >
                              <Trash2 size={14} color="#EF4444" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      style={{
                        padding: isEditing ? '8px' : hasMedia && !msg.isDeleted ? '6px' : '12px 18px',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        backgroundColor: msg.isDeleted
                          ? '#F8FAFC'
                          : isMe
                          ? '#FF5A36'
                          : '#F4F5F8',
                        color: msg.isDeleted
                          ? '#94A3B8'
                          : isMe
                          ? '#FFFFFF'
                          : '#1C2024',
                        fontStyle: msg.isDeleted ? 'italic' : 'normal',
                        border: msg.isDeleted ? '1px dashed #CBD5E1' : 'none',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: msg.isDeleted
                          ? 'none'
                          : isMe
                          ? '0 4px 14px rgba(255, 90, 54, 0.22)'
                          : '0 2px 8px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        minWidth: isEditing ? '220px' : undefined,
                      }}
                    >
                      {/* Inline edit mode */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(roomId, msg.id);
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            autoFocus
                            style={{
                              background: 'rgba(255,255,255,0.2)',
                              border: '1px solid rgba(255,255,255,0.5)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              width: '100%',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={handleEditCancel}
                              style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px', fontWeight: 600 }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEditSave(roomId, msg.id)}
                              style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#FF5A36', fontSize: '12px', fontWeight: 600 }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Deleted message placeholder */}
                          {msg.isDeleted ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', opacity: 0.65 }}>
                                <span style={{ fontSize: '13px' }}>🗑️ Message Deleted</span>
                              </p>
                              {/* Admin-only: show original content */}
                              {currentUser?.role === 'admin' && msg.content && (
                                <div style={{
                                  marginTop: '4px',
                                  padding: '6px 10px',
                                  backgroundColor: 'rgba(239,68,68,0.08)',
                                  borderRadius: '8px',
                                  border: '1px dashed rgba(239,68,68,0.35)',
                                }}>
                                  <p style={{ margin: 0, fontSize: '11px', color: '#EF4444', fontWeight: 600, marginBottom: '2px', fontStyle: 'normal' }}>Admin view — original content:</p>
                                  <p style={{ margin: 0, fontSize: '12px', color: '#7C3AED', fontStyle: 'normal', wordBreak: 'break-word' }}>{msg.content}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {/* Media content */}
                              {hasMedia && (
                                <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                                  {isVideoMsg ? (
                                    <video src={msg.fileUrl} controls style={{ maxWidth: '280px', maxHeight: '280px', borderRadius: '14px', display: 'block' }} />
                                  ) : (
                                    <img
                                      src={msg.fileUrl}
                                      alt="Attached image"
                                      onClick={() => setViewingImage(msg.fileUrl || null)}
                                      style={{ maxWidth: '280px', maxHeight: '280px', borderRadius: '14px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                    />
                                  )}
                                </div>
                              )}
                              {/* Text content */}
                              {msg.content && (
                                <p style={{ margin: 0, padding: hasMedia ? '4px 8px 6px' : 0 }}>{msg.content}</p>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp + status + edited tag */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '4px', padding: '0 4px' }}>
                    <span style={{ fontSize: '10.5px', color: '#9BA3AF' }}>{msg.createdAt}</span>
                    {msg.isEdited && !msg.isDeleted && (
                      <span style={{ fontSize: '10px', color: '#9BA3AF', fontStyle: 'italic' }}>(edited)</span>
                    )}
                    {isMe && !msg.isDeleted && (
                      <span style={{ display: 'flex', alignItems: 'center' }} title={msg.status === 'read' ? 'Seen' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                        {msg.status === 'read' ? <CheckCheck size={14} color="#FF5A36" /> : msg.status === 'delivered' ? <CheckCheck size={14} color="#9BA3AF" /> : <Check size={14} color="#9BA3AF" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          });

          return items;
        })()}

        {isPartnerTyping && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              alignSelf: 'flex-start',
              marginTop: '4px',
              marginBottom: '4px',
            }}
          >
            <img
              src={activeConversation.user.profile_picture || fallbackAvatar}
              alt={activeConversation.user.name}
              style={{ ...styles.msgAvatar, cursor: 'pointer' }}
              onClick={() => onViewProfile?.(activeConversation.user)}
              title={`View ${activeConversation.user.name}'s profile`}
            />
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '18px 18px 18px 4px',
                backgroundColor: '#F4F5F8',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Send failure banner */}
        {sendError && (
          <div style={styles.sendErrorBanner}>
            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '12.5px' }}>Message failed to send.</span>
            <button
              style={styles.retryBtn}
              onClick={(e) => handleSend(e as any, sendError.text, sendError.fileUrl, sendError.fileType)}
            >
              <RotateCcw size={12} />
              Retry
            </button>
            <button
              style={styles.dismissErrorBtn}
              onClick={() => setSendError(null)}
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Media Attachment Preview Bar ───────────────────── */}
      {mediaPreview && (
        <div style={styles.previewBar}>
          <div style={styles.previewInner}>
            {mediaPreview.isVideo ? (
              <video src={mediaPreview.url} style={styles.previewThumb} />
            ) : (
              <img src={mediaPreview.url} alt="Preview" style={styles.previewThumb} />
            )}
            <div style={{ flex: 1 }}>
              <p style={styles.previewName}>{mediaPreview.file.name}</p>
              <p style={styles.previewSize}>
                {(mediaPreview.file.size / (1024 * 1024)).toFixed(2)} MB • {mediaPreview.isVideo ? 'Video' : 'Photo'}
              </p>
            </div>
            <button
              onClick={() => setMediaPreview(null)}
              style={styles.removePreviewBtn}
              title="Remove attachment"
            >
              <X size={16} color="#737D8C" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input Bar ────────────────────────────────────────── */}
      {isBlocked ? (
        <div style={styles.blockedBanner}>
          <ShieldAlert size={18} color="#EF4444" />
          <span>You have blocked this contact.</span>
          <button
            type="button"
            onClick={() => unblockUser(activeConversation.user.id)}
            style={styles.unblockBtn}
          >
            Unblock
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div style={styles.emojiPicker} onClick={(e) => e.stopPropagation()}>
              <div style={styles.emojiTabs}>
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveEmojiTab(idx)}
                    style={{
                      ...styles.emojiTabBtn,
                      backgroundColor: activeEmojiTab === idx ? '#FFF0EB' : 'transparent',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div style={styles.emojiGrid}>
                {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleInsertEmoji(emoji)}
                    style={styles.emojiBtn}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} style={styles.inputContainer}>
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...styles.inputActionBtn,
                backgroundColor: mediaPreview ? '#FFF0EB' : '#F5F6F8',
              }}
              title="Attach photo or video"
            >
              <Paperclip size={19} color={mediaPreview ? '#FF5A36' : '#737D8C'} />
            </button>

            <input
              ref={textInputRef}
              type="text"
              placeholder={mediaPreview ? 'Add a caption (optional)...' : 'Type a message...'}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              style={styles.textInput}
              autoComplete="off"
              disabled={isSending || isUploadingMedia}
            />

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
              style={{
                ...styles.inputActionBtn,
                backgroundColor: showEmojiPicker ? '#FFF0EB' : '#F5F6F8',
              }}
              title="Add Emoji"
            >
              <Smile size={19} color={showEmojiPicker ? '#FF5A36' : '#737D8C'} />
            </button>

            <button
              type="submit"
              style={{
                ...styles.sendBtn,
                opacity: (isSending || isUploadingMedia || (!inputMessage.trim() && !mediaPreview)) ? 0.6 : 1,
                cursor: (isSending || isUploadingMedia || (!inputMessage.trim() && !mediaPreview)) ? 'not-allowed' : 'pointer',
              }}
              title="Send message"
              disabled={isSending || isUploadingMedia || (!inputMessage.trim() && !mediaPreview)}
            >
              {isSending || isUploadingMedia ? (
                <Loader2 size={16} color="#FFFFFF" style={styles.spinner} />
              ) : (
                <Send size={16} color="#FFFFFF" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Image Lightbox Modal ─────────────────────────────── */}
      {viewingImage && (
        <div style={styles.lightboxOverlay} onClick={() => setViewingImage(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={viewingImage} alt="Full preview" style={styles.lightboxImage} />
            <button style={styles.lightboxCloseBtn} onClick={() => setViewingImage(null)}>
              <X size={20} color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
    height: '100%',
    minHeight: 0,
  },
  mobileBackBtn: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
    flexShrink: 0,
    border: 'none',
    marginRight: '2px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #F0F2F5',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarWrap: {
    position: 'relative',
    width: '44px',
    height: '44px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '0px',
    right: '0px',
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
    border: '2px solid #FFFFFF',
  },
  userName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1C2024',
    marginBottom: '2px',
  },
  userStatus: {
    fontSize: '12px',
    fontWeight: 500,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  dropdown: {
    position: 'absolute',
    top: '44px',
    right: '0px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    borderRadius: '14px',
    padding: '8px',
    minWidth: '164px',
    zIndex: 30,
  },
  dropdownItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#1C2024',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  feed: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',
    scrollbarColor: '#E0E4E9 transparent',
  },
  loadingState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#8A94A6',
  },
  emptyMessages: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '60px 24px',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#FFF3EE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1C2024',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: '#9BA3AF',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  msgAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    marginBottom: '18px',
  },
  previewBar: {
    padding: '8px 20px',
    borderTop: '1px solid #F0F2F5',
    backgroundColor: '#FFF9F7',
  },
  previewInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #FFD5C8',
  },
  previewThumb: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  previewName: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#1C2024',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  previewSize: {
    fontSize: '11px',
    color: '#8A94A6',
  },
  removePreviewBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderTop: '1px solid #F0F2F5',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  inputActionBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    borderRadius: '9999px',
    padding: '12px 20px',
    fontSize: '14px',
    color: '#1C2024',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.3)',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  emojiPicker: {
    position: 'absolute',
    bottom: '60px',
    right: '60px',
    width: '290px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
    borderRadius: '18px',
    padding: '12px',
    zIndex: 40,
    border: '1px solid #F0F2F5',
  },
  emojiTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingBottom: '8px',
    borderBottom: '1px solid #F0F2F5',
    marginBottom: '8px',
  },
  emojiTabBtn: {
    flex: 1,
    padding: '6px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  emojiBtn: {
    fontSize: '20px',
    padding: '6px 4px',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.1s',
  },
  blockedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '14px 20px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    fontSize: '13.5px',
    fontWeight: 500,
    borderTop: '1px solid #FEE2E2',
    flexShrink: 0,
  },
  unblockBtn: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: '9999px',
    cursor: 'pointer',
    border: 'none',
  },
  chatSearchBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#FFF9F7',
    borderBottom: '1px solid #FFD5C8',
    flexShrink: 0,
  },
  chatSearchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#1C2024',
  },
  clearSearchBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E4E9',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    borderRadius: '12px',
    objectFit: 'contain',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: '-16px',
    right: '-16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1C2024',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #FFFFFF',
  },
  // ── Message action button & dropdown ────────────────────────────────────────
  msgActionBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: '#F0F2F5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    border: '1px solid #E8ECEF',
  } as React.CSSProperties,
  msgDropdown: {
    position: 'absolute' as const,
    bottom: '30px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    borderRadius: '12px',
    padding: '6px',
    minWidth: '140px',
    zIndex: 50,
    border: '1px solid #F0F2F5',
  },
  msgDropdownItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#1C2024',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    backgroundColor: 'transparent',
    textAlign: 'left' as const,
  },
  // ── Date separator ──────────────────────────────────────────────────────────
  dateSeparator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '12px 0 4px',
    alignSelf: 'stretch' as const,
    width: '100%',
  },
  dateSeparatorLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#F0F2F5',
    display: 'block' as const,
  },
  dateSeparatorChip: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9BA3AF',
    backgroundColor: '#F8F9FB',
    padding: '3px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.2px',
  },
  // ── Send error banner ───────────────────────────────────────────────────────
  sendErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFF1F2',
    border: '1px solid #FCA5A5',
    borderRadius: '12px',
    padding: '8px 12px',
    marginTop: '4px',
    alignSelf: 'stretch' as const,
  },
  retryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
  },
  dismissErrorBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCA5A5',
    cursor: 'pointer',
    border: 'none',
    padding: 0,
    flexShrink: 0,
    color: '#EF4444',
  },
};

