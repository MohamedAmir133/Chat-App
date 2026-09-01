import React from 'react';
import { Search, Sparkles, Loader2, LogIn } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Conversation } from '@/types';

export function Sidebar({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const { user } = useAuth();
  const {
    activeTab,
    setActiveTab,
    activeConversation,
    selectConversation,
    filteredConversations,
    isLoadingRooms,
    setSearchQuery,
    toggleFavorite,
  } = useChat();

  const tabs: Array<{ id: 'all' | 'unread' | 'favorites' | 'blocked'; label: string }> = [
    { id: 'all', label: 'All messages' },
    { id: 'unread', label: 'Unread' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'blocked', label: 'Blocked' },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Messages</h2>
        <button style={styles.searchToggleBtn} title="Filter search">
          <Search size={18} color="#4E5969" />
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabsList}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                color: isActive ? '#FF5A36' : '#737D8C',
                fontWeight: isActive ? 600 : 500,
                borderBottom: isActive ? '2px solid #FF5A36' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feature Action Banner */}
      <div style={styles.bannerContainer}>
        <button style={styles.aiBanner}>
          <Sparkles size={16} color="#FFFFFF" style={{ marginRight: '6px' }} />
          <span>Chat smarter with Sunday AI!</span>
        </button>
      </div>

      {/* Conversations List */}
      <div style={styles.convList}>
        {/* Sign-in nudge for guests */}
        {!user && (
          <div style={styles.loginNudge}>
            <div style={styles.loginNudgeInner}>
              <LogIn size={20} color="#FF5A36" />
              <div>
                <p style={styles.loginNudgeTitle}>Sign in to chat</p>
                <p style={styles.loginNudgeSub}>Your conversations are below as a preview</p>
              </div>
            </div>
            <button onClick={onOpenAuth} style={styles.loginNudgeBtn}>Sign In</button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoadingRooms ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={styles.skeletonItem}>
              <div style={styles.skeletonAvatar} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...styles.skeletonLine, width: '60%' }} />
                <div style={{ ...styles.skeletonLine, width: '85%', height: '10px', opacity: 0.5 }} />
              </div>
            </div>
          ))
        ) : filteredConversations.length === 0 ? (
          <div style={styles.emptyNotice}>
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv: Conversation) => {
            const isSelected = activeConversation?.user.id === conv.user.id;
            const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.name)}&background=FF5A36&color=fff&size=80`;
            return (
              <div
                key={conv.user.id}
                onClick={() => selectConversation(conv)}
                style={{
                  ...styles.convItem,
                  backgroundColor: isSelected ? '#FFF5F2' : 'transparent',
                  borderLeft: isSelected ? '3px solid #FF5A36' : '3px solid transparent',
                }}
              >
                {/* Avatar with Online indicator */}
                <div style={styles.avatarWrap}>
                  <img
                    src={conv.user.profile_picture || avatarFallback}
                    alt={conv.user.name}
                    style={styles.avatarImg}
                  />
                  {conv.user.isOnline && <span style={styles.onlineDot} />}
                </div>

                {/* Info & Snippet */}
                <div style={styles.convDetails}>
                  <div style={styles.topRow}>
                    <span style={styles.userName}>{conv.user.name}</span>
                    <span style={styles.timestamp}>
                      {conv.lastMessage?.timestamp || ''}
                    </span>
                  </div>

                  <div style={styles.bottomRow}>
                    <p style={styles.snippet}>
                      {conv.lastMessage?.content || 'Say hello!'}
                    </p>

                    {conv.unreadCount > 0 && (
                      <span style={styles.unreadBadge}>{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '340px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 120px)',
    maxHeight: '780px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px 14px 8px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1C2024',
    letterSpacing: '-0.3px',
  },
  searchToggleBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
  },
  tabsList: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid #F0F2F5',
    paddingBottom: '2px',
    marginBottom: '16px',
    overflowX: 'auto',
  },
  tabBtn: {
    fontSize: '13px',
    padding: '6px 4px 10px 4px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  bannerContainer: {
    marginBottom: '16px',
    padding: '0 4px',
  },
  aiBanner: {
    width: '100%',
    background: 'linear-gradient(135deg, #FF6F43 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    padding: '12px 16px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: '13.5px',
    boxShadow: '0 4px 14px rgba(255, 90, 54, 0.3)',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingRight: '4px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 10px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  avatarWrap: {
    position: 'relative',
    width: '46px',
    height: '46px',
    flexShrink: 0,
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
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
    border: '2px solid #FFFFFF',
  },
  convDetails: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: '14.5px',
    fontWeight: 600,
    color: '#1C2024',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  timestamp: {
    fontSize: '11.5px',
    color: '#8A94A6',
    fontWeight: 500,
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  snippet: {
    fontSize: '12.5px',
    color: '#737D8C',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: 700,
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyNotice: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#8A94A6',
    fontSize: '13.5px',
  },
  loginNudge: {
    margin: '0 4px 12px',
    padding: '12px 14px',
    backgroundColor: '#FFF5F2',
    borderRadius: '14px',
    border: '1px solid #FFD5C8',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  loginNudgeInner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  loginNudgeTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1C2024',
  },
  loginNudgeSub: {
    fontSize: '11.5px',
    color: '#8A94A6',
    marginTop: '2px',
  },
  loginNudgeBtn: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
    fontSize: '12.5px',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '9999px',
    cursor: 'pointer',
    alignSelf: 'flex-start' as const,
  },
  skeletonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 10px',
  },
  skeletonAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#F0F2F5',
    flexShrink: 0,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonLine: {
    height: '12px',
    borderRadius: '6px',
    backgroundColor: '#F0F2F5',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
