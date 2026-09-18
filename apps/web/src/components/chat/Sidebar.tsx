import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, LogIn, X, UserPlus, Bookmark, Archive, ArchiveRestore, MessageSquarePlus, AlertCircle, Users } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { Conversation, User } from '@/types';
import { apiRequest } from '@/lib/api';

interface ContextMenu {
  x: number;
  y: number;
  conv: Conversation;
}

export function Sidebar({ onOpenAuth, onViewProfile, onCreateGroup }: { onOpenAuth?: () => void; onViewProfile?: (user: User) => void; onCreateGroup?: () => void }) {
  const { user } = useAuth();
  const {
    activeTab,
    setActiveTab,
    activeConversation,
    selectConversation,
    conversations,
    filteredConversations,
    isLoadingRooms,
    loadRoomError,
    searchQuery,
    setSearchQuery,
    startDirectChat,
    typingUsers,
    archivedConversationIds,
    archiveConversation,
    unarchiveConversation,
  } = useChat();

  const [showSearch, setShowSearch] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setGlobalSearchResults([]);
      setIsSearchingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const results = await apiRequest<any[]>(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (Array.isArray(results)) {
          const existingUserIds = new Set((conversations || []).map((c) => c.user.id));
          // Exclude self from global search results (user can use Saved Messages button instead)
          const newUsers = results.filter((u: any) => !existingUserIds.has(u.userId) && u.userId !== user.id);
          setGlobalSearchResults(newUsers);
        }
      } catch (err) {
        console.error('Global user search failed:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, user, conversations]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const tabs: Array<{ id: 'all' | 'unread' | 'blocked' | 'archived'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'archived', label: 'Archived' },
    { id: 'blocked', label: 'Blocked' },
  ];

  const archivedCount = archivedConversationIds.length;

  const handleSavedMessages = () => {
    if (!user) { onOpenAuth?.(); return; }
    startDirectChat(user.id, {
      id: user.id,
      name: `${user.name} (You)`,
      email: user.email || '',
      profile_picture: user.profile_picture,
      isOnline: true,
    });
  };

  const handleContextMenu = (e: React.MouseEvent, conv: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  };

  return (
    <aside style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Messages</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Create Group Button */}
          {user && (
            <button
              onClick={onCreateGroup}
              style={{ ...styles.iconBtn, backgroundColor: '#FFF0EB' }}
              title="Create Group"
            >
              <Users size={16} color="#FF5A36" />
            </button>
          )}
          {/* Saved Messages shortcut */}
          {user && (
            <button
              onClick={handleSavedMessages}
              style={{ ...styles.iconBtn, backgroundColor: '#FFF0EB' }}
              title="Saved Messages (chat with yourself)"
            >
              <Bookmark size={16} color="#FF5A36" />
            </button>
          )}
          <button
            onClick={() => {
              if (showSearch && searchQuery) setSearchQuery('');
              setShowSearch(!showSearch);
            }}
            style={{
              ...styles.iconBtn,
              backgroundColor: showSearch ? '#FFF0EB' : '#F5F6F8',
            }}
            title="Search conversations"
          >
            <Search size={18} color={showSearch ? '#FF5A36' : '#4E5969'} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      {showSearch && (
        <div style={styles.searchContainer}>
          <Search size={15} color="#8A94A6" style={{ marginRight: '8px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search contacts & messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={14} color="#737D8C" />
            </button>
          )}
        </div>
      )}

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
              {tab.id === 'archived' && archivedCount > 0 && (
                <span style={styles.tabBadge}>{archivedCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations List */}
      <div style={styles.convList}>
        {/* Sign-in nudge for guests */}
        {!user && (
          <div style={styles.loginNudge}>
            <div style={styles.loginNudgeInner}>
              <div style={styles.loginNudgeIconWrap}>
                <LogIn size={20} color="#FF5A36" />
              </div>
              <div>
                <p style={styles.loginNudgeTitle}>Sign in to start chatting</p>
                <p style={styles.loginNudgeSub}>Create an account or sign in to access your real conversations</p>
              </div>
            </div>
            <button onClick={onOpenAuth} style={styles.loginNudgeBtn}>Sign In / Sign Up</button>
          </div>
        )}

        {/* Network / load error */}
        {loadRoomError && user && (
          <div style={styles.errorBanner}>
            <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '12px' }}>{loadRoomError}</span>
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
        ) : (filteredConversations.length === 0 && globalSearchResults.length === 0 && !isSearchingGlobal) ? (
          /* ── Empty states ─────────────────────────────────────────── */
          <div style={styles.emptyState}>
            {searchQuery ? (
              <>
                <div style={styles.emptyIcon}>🔍</div>
                <p style={styles.emptyTitle}>No results for "{searchQuery}"</p>
                <p style={styles.emptySubtitle}>Try a different name or check your spelling.</p>
                <button onClick={() => setSearchQuery('')} style={styles.emptyAction}>Clear search</button>
              </>
            ) : activeTab === 'unread' ? (
              <>
                <div style={styles.emptyIcon}>✅</div>
                <p style={styles.emptyTitle}>All caught up!</p>
                <p style={styles.emptySubtitle}>No unread messages right now.</p>
              </>
            ) : activeTab === 'archived' ? (
              <>
                <div style={styles.emptyIcon}>📦</div>
                <p style={styles.emptyTitle}>No archived chats</p>
                <p style={styles.emptySubtitle}>Right-click any conversation to archive it.</p>
              </>
            ) : activeTab === 'blocked' ? (
              <>
                <div style={styles.emptyIcon}>🛡️</div>
                <p style={styles.emptyTitle}>No blocked contacts</p>
                <p style={styles.emptySubtitle}>Users you block will appear here.</p>
              </>
            ) : user ? (
              <>
                <div style={styles.emptyIcon}><MessageSquarePlus size={38} color="#E0E4E9" /></div>
                <p style={styles.emptyTitle}>No conversations yet</p>
                <p style={styles.emptySubtitle}>Search for someone above to start your first chat, or write a note to yourself.</p>
                <button
                  onClick={() => { setShowSearch(true); }}
                  style={styles.emptyAction}
                >
                  Find someone to chat with
                </button>
                <button onClick={handleSavedMessages} style={{ ...styles.emptyAction, marginTop: '8px', backgroundColor: '#FFF0EB', color: '#FF5A36' }}>
                  <Bookmark size={14} style={{ marginRight: '6px' }} /> Saved Messages
                </button>
              </>
            ) : (
              <p style={{ color: '#8A94A6', fontSize: '13.5px', textAlign: 'center', padding: '16px' }}>Sign in to see your conversations</p>
            )}
          </div>
        ) : (
          <>
            {/* Conversation list */}
            {filteredConversations.map((conv: Conversation) => {
              const isSelected = activeConversation?.user.id === conv.user.id;
              const isArchived = archivedConversationIds.includes(conv.user.id);
              const isSelf = conv.isSelfRoom === true || (!!user && conv.user.id === user.id);
              const isGroup = conv.isGroup === true;
              const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user.name)}&background=FF5A36&color=fff&size=80`;
              return (
                <div
                  key={conv.user.id}
                  onClick={() => selectConversation(conv)}
                  onContextMenu={(e) => handleContextMenu(e, conv)}
                  style={{
                    ...styles.convItem,
                    backgroundColor: isSelected ? '#FFF5F2' : 'transparent',
                    borderLeft: isSelected ? '3px solid #FF5A36' : '3px solid transparent',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{ ...styles.avatarWrap, cursor: isGroup ? 'default' : 'pointer', position: 'relative' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelf && !isGroup) onViewProfile?.(conv.user);
                    }}
                    title={isSelf ? 'Saved Messages' : isGroup ? conv.user.name : `View ${conv.user.name}'s profile`}
                  >
                    {isSelf ? (
                      <div style={styles.savedMessagesAvatar}>
                        <Bookmark size={22} color="#FFFFFF" />
                      </div>
                    ) : isGroup ? (
                      <div style={styles.groupAvatar}>
                        {conv.user.profile_picture ? (
                          <img
                            src={conv.user.profile_picture}
                            alt={conv.user.name}
                            style={styles.avatarImg}
                          />
                        ) : (
                          <Users size={22} color="#FFFFFF" />
                        )}
                      </div>
                    ) : (
                      <img
                        src={conv.user.profile_picture || avatarFallback}
                        alt={conv.user.name}
                        style={styles.avatarImg}
                      />
                    )}
                    {conv.user.isOnline && !isSelf && !isGroup && <span style={styles.onlineDot} />}
                    {isArchived && (
                      <span style={styles.archivedBadge} title="Archived">
                        <Archive size={8} color="#FFFFFF" />
                      </span>
                    )}
                  </div>

                  {/* Info & Snippet */}
                  <div style={styles.convDetails}>
                    <div style={styles.topRow}>
                      <span style={styles.userName}>
                        {isSelf ? 'Saved Messages' : conv.user.name}
                        {isGroup && conv.memberCount && (
                          <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>
                            ({conv.memberCount} members)
                          </span>
                        )}
                      </span>
                      <span style={styles.timestamp}>
                        {conv.lastMessage?.timestamp || ''}
                      </span>
                    </div>

                    <div style={styles.bottomRow}>
                      {typingUsers[conv.user.id] ? (
                        <p
                          style={{
                            ...styles.snippet,
                            color: '#FF5A36',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>typing</span>
                          <span className="typing-dots-container">
                            <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '3.5px', height: '3.5px' }} />
                            <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '3.5px', height: '3.5px' }} />
                            <span className="typing-dot" style={{ backgroundColor: '#FF5A36', width: '3.5px', height: '3.5px' }} />
                          </span>
                        </p>
                      ) : (
                        <p style={styles.snippet}>
                          {isSelf
                            ? (conv.lastMessage?.content || 'Your personal notepad')
                            : isGroup
                            ? (conv.lastMessage?.content || 'Group created')
                            : (conv.lastMessage?.content || 'Say hello!')}
                        </p>
                      )}

                      {conv.unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Global User Search Results */}
            {searchQuery.trim() && (globalSearchResults.length > 0 || isSearchingGlobal) && (
              <div style={styles.globalSearchSection}>
                <div style={styles.globalSearchHeader}>
                  <span>Start new chat</span>
                  {isSearchingGlobal && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>

                {globalSearchResults.map((u: any) => {
                  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=FF5A36&color=fff&size=80`;
                  return (
                    <div
                      key={u.userId}
                      onClick={() => {
                        startDirectChat(u.userId, {
                          id: u.userId,
                          name: u.name,
                          email: u.email,
                          profile_picture: u.profile_picture,
                          isOnline: u.isOnline,
                        });
                        setSearchQuery('');
                      }}
                      style={styles.convItem}
                      title={`Start chat with ${u.name}`}
                    >
                      <div style={styles.avatarWrap}>
                        <img
                          src={u.profile_picture || avatarFallback}
                          alt={u.name}
                          style={styles.avatarImg}
                        />
                        {u.isOnline && <span style={styles.onlineDot} />}
                      </div>

                      <div style={styles.convDetails}>
                        <span style={styles.userName}>{u.name}</span>
                        <p style={styles.snippet}>{u.email}</p>
                      </div>

                      <div style={styles.newChatBtn}>
                        <UserPlus size={15} color="#FF5A36" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            ...styles.contextMenu,
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {archivedConversationIds.includes(contextMenu.conv.user.id) ? (
            <button
              style={styles.contextMenuItem}
              onClick={() => { unarchiveConversation(contextMenu.conv.user.id); setContextMenu(null); }}
            >
              <ArchiveRestore size={15} color="#22C55E" />
              <span>Unarchive chat</span>
            </button>
          ) : (
            <button
              style={styles.contextMenuItem}
              onClick={() => { archiveConversation(contextMenu.conv.user.id); setContextMenu(null); }}
            >
              <Archive size={15} color="#FF5A36" />
              <span>Archive chat</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    flexShrink: 0,
    overflow: 'hidden',
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
  iconBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    border: 'none',
    padding: 0,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: '14px',
    padding: '8px 12px',
    margin: '0 4px 14px 4px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13px',
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
  tabsList: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    borderBottom: '1px solid #F0F2F5',
    paddingBottom: '2px',
    marginBottom: '16px',
    overflowX: 'auto',
  },
  tabBtn: {
    fontSize: '12.5px',
    padding: '6px 4px 10px 4px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  tabBadge: {
    backgroundColor: '#FF5A36',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '10px',
  },
  convList: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingRight: '4px',
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',
    scrollbarColor: '#E0E4E9 transparent',
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
  savedMessagesAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF6F43, #FF4D29)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.3)',
  },
  groupAvatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
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
  archivedBadge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#9BA3AF',
    border: '2px solid #FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    margin: 0,
  },
  unreadBadge: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '0 4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    gap: '8px',
    flex: 1,
  },
  emptyIcon: {
    fontSize: '38px',
    marginBottom: '4px',
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1C2024',
    textAlign: 'center',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: '12.5px',
    color: '#8A94A6',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: '2px 0 8px',
  },
  emptyAction: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
    fontSize: '12.5px',
    fontWeight: 600,
    padding: '9px 20px',
    borderRadius: '9999px',
    cursor: 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'opacity 0.2s',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: '#FFF1F2',
    border: '1px solid #FCA5A5',
    borderRadius: '12px',
    padding: '10px 12px',
    margin: '0 4px 12px 4px',
    color: '#EF4444',
  },
  loginNudge: {
    margin: '0 4px 16px',
    padding: '16px',
    background: 'linear-gradient(135deg, #FFF5F2 0%, #FFF9F7 100%)',
    borderRadius: '16px',
    border: '1px solid #FFD5C8',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  loginNudgeInner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  loginNudgeIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FFF0EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loginNudgeTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#1C2024',
    margin: '0 0 3px',
  },
  loginNudgeSub: {
    fontSize: '12px',
    color: '#8A94A6',
    lineHeight: 1.4,
    margin: 0,
  },
  loginNudgeBtn: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 600,
    padding: '10px 20px',
    borderRadius: '9999px',
    cursor: 'pointer',
    border: 'none',
    alignSelf: 'flex-start' as const,
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.3)',
    transition: 'opacity 0.2s',
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
  globalSearchSection: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #F0F2F5',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  globalSearchHeader: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#FF5A36',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 8px 8px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newChatBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#FFF0EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    borderRadius: '14px',
    padding: '6px',
    minWidth: '180px',
    zIndex: 9999,
    border: '1px solid #F0F2F5',
  },
  contextMenuItem: {
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
    border: 'none',
    backgroundColor: 'transparent',
  },
};
