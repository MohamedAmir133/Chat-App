import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Star,
  ShieldAlert,
  ShieldCheck,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';

export function ChatView() {
  const { user: currentUser } = useAuth();
  const {
    activeConversation,
    messages,
    sendMessage,
    toggleFavorite,
    blockUser,
    unblockUser,
    blockedUserIds,
    isLoadingMessages,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBlocked =
    activeConversation &&
    (blockedUserIds.includes(activeConversation.user.id) || activeConversation.isBlocked);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setShowOptions(false);
    if (showOptions) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showOptions]);

  if (!activeConversation) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputMessage.trim();
    if (!content || isBlocked || isSending) return;
    setInputMessage('');
    setIsSending(true);
    try {
      await sendMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation.user.name)}&background=FF5A36&color=fff&size=150`;

  return (
    <div style={styles.container}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatarWrap}>
            <img
              src={activeConversation.user.profile_picture || fallbackAvatar}
              alt={activeConversation.user.name}
              style={styles.avatarImg}
            />
            {activeConversation.user.isOnline && <span style={styles.onlineDot} />}
          </div>

          <div>
            <h3 style={styles.userName}>{activeConversation.user.name}</h3>
            <p style={styles.userStatus}>
              {activeConversation.user.isOnline ? (
                <span style={{ color: '#22C55E' }}>● Active now</span>
              ) : (
                <span style={{ color: '#9BA3AF' }}>Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.headerActions}>
          <button
            onClick={() => toggleFavorite(activeConversation.user.id)}
            style={styles.iconBtn}
            title={activeConversation.isFavorite ? 'Remove favorite' : 'Add to favorites'}
          >
            <Star
              size={18}
              color={activeConversation.isFavorite ? '#FF5A36' : '#737D8C'}
              fill={activeConversation.isFavorite ? '#FF5A36' : 'none'}
            />
          </button>

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
        </div>
      </div>

      {/* ── Message Feed ─────────────────────────────────────── */}
      <div style={styles.feed}>
        {isLoadingMessages ? (
          <div style={styles.loadingState}>
            <Loader2 size={28} color="#FF5A36" style={styles.spinner} />
            <p style={styles.loadingText}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyMessages}>
            <div style={styles.emptyIcon}>
              <MessageCircle size={36} color="#FFCCBA" />
            </div>
            <p style={styles.emptyTitle}>No messages yet</p>
            <p style={styles.emptySubtitle}>
              Say hello to {activeConversation.user.name}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // Robust sender check:
            // 1. Matches currentUser.id or 'me'
            // 2. Or in 1-on-1 direct chat, if senderId is NOT the other user's id, it's from ME
            const isMe =
              Boolean(currentUser?.id && msg.senderId === currentUser.id) ||
              msg.senderId === 'me' ||
              Boolean(activeConversation?.user?.id && msg.senderId !== activeConversation.user.id);

            const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConversation.user.name)}&background=FF5A36&color=fff&size=64`;

            return (
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
                }}
              >
                {!isMe && (
                  <img
                    src={activeConversation.user.profile_picture || fallback}
                    alt={activeConversation.user.name}
                    style={styles.msgAvatar}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    gap: '4px',
                    maxWidth: '100%',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      backgroundColor: isMe ? '#FF5A36' : '#F4F5F8',
                      color: isMe ? '#FFFFFF' : '#1C2024',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      boxShadow: isMe
                        ? '0 4px 14px rgba(255, 90, 54, 0.22)'
                        : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <p style={{ margin: 0 }}>{msg.content}</p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      gap: '4px',
                      padding: '0 4px',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', color: '#9BA3AF' }}>{msg.createdAt}</span>
                    {isMe && (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {msg.status === 'read' ? (
                          <CheckCheck size={13} color="#FF5A36" />
                        ) : (
                          <Check size={13} color="#9BA3AF" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ────────────────────────────────────────── */}
      {isBlocked ? (
        <div style={styles.blockedBanner}>
          <ShieldAlert size={18} color="#EF4444" />
          <span>You have blocked this contact. Unblock to send messages.</span>
        </div>
      ) : (
        <form onSubmit={handleSend} style={styles.inputContainer}>
          <button type="button" style={styles.inputActionBtn} title="Attach file">
            <Paperclip size={19} color="#737D8C" />
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.textInput}
            autoComplete="off"
            disabled={isSending}
          />

          <button type="button" style={styles.inputActionBtn} title="Emoji">
            <Smile size={19} color="#737D8C" />
          </button>

          <button
            type="submit"
            style={{
              ...styles.sendBtn,
              opacity: isSending || !inputMessage.trim() ? 0.6 : 1,
              cursor: isSending || !inputMessage.trim() ? 'not-allowed' : 'pointer',
            }}
            title="Send message"
            disabled={isSending || !inputMessage.trim()}
          >
            {isSending ? (
              <Loader2 size={16} color="#FFFFFF" style={styles.spinner} />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
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
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    width: '100%',
  },
  msgAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
    marginBottom: '18px',
  },
  msgBubbleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '100%',
  },
  bubble: {
    padding: '11px 16px',
    borderRadius: '18px',
    wordBreak: 'break-word',
  },
  msgText: {
    fontSize: '14px',
    lineHeight: 1.5,
    margin: 0,
  },
  msgMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 4px',
  },
  msgTime: {
    fontSize: '10.5px',
    color: '#9BA3AF',
  },
  msgStatus: {
    display: 'flex',
    alignItems: 'center',
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
  blockedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    fontSize: '13.5px',
    fontWeight: 500,
    borderTop: '1px solid #FEE2E2',
    flexShrink: 0,
  },
};
