import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import {
  Users,
  MessageSquare,
  Hash,
  Trash2,
  LogOut,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  MessageCircle,
  FileText,
  Clock,
  Sparkles,
  Layers,
  EyeOff,
  Flame,
  AlertTriangle,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'rooms' | 'messages'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Messages UI state
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
      return;
    }
  }, [user, router]);

  // Load necessary data when switching tabs
  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'rooms') {
      loadRooms();
      loadUsers(); // for owner name mapping
    }
    if (activeTab === 'messages') {
      loadMessages();
      loadRooms();
      loadUsers();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users list');
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load rooms:', err);
      toast.error('Failed to load rooms list');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/admin/messages');
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      toast.error('Failed to load messages list');
    } finally {
      setLoading(false);
    }
  };

  // Map users by id for quick lookup
  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach((u) => {
      if (u.id) map[u.id] = u;
      if (u._id) map[u._id] = u;
    });
    return map;
  }, [users]);

  // Map rooms by id for quick lookup
  const roomMap = useMemo(() => {
    const map: Record<string, any> = {};
    rooms.forEach((r) => {
      if (r.id) map[r.id] = r;
      if (r._id) map[r._id] = r;
    });
    return map;
  }, [rooms]);

  // Clean room name formatting helper
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const resolveUuidName = (id: string): string =>
    userMap[id]?.name || id.substring(0, 8) + '...';

  const formatRoomName = (room: any, rId?: string): string => {
    const actualRoom = room || (rId ? roomMap[rId] : null);
    if (!actualRoom) {
      return rId ? `Room ${rId.substring(0, 8)}...` : 'Unknown Room';
    }

    if (actualRoom.name) {
      const n = actualRoom.name;

      // Legacy saved format: saved_<uuid>
      if (n.startsWith('saved_')) {
        const ownerName = userMap[actualRoom.owner_id]?.name || actualRoom.owner_id || 'User';
        return `Own_${ownerName}_messages`;
      }

      // Legacy dm_ format: dm_<uuid>_<uuid>
      if (n.startsWith('dm_')) {
        const withoutPrefix = n.slice(3);
        const firstId = withoutPrefix.substring(0, 36);
        const secondId = withoutPrefix.substring(37);
        const name1 = resolveUuidName(firstId);
        const name2 = UUID_RE.test(secondId) ? resolveUuidName(secondId) : secondId;
        return name2 ? `${name1}_${name2} Room` : `${name1} Room`;
      }

      // Intermediate format: <uuid>_<uuid> room  (or Room)
      // Detect if the name starts with two back-to-back UUIDs separated by underscore
      const uuidPairMatch = n.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*[Rr]oom$/i
      );
      if (uuidPairMatch) {
        const name1 = resolveUuidName(uuidPairMatch[1]);
        const name2 = resolveUuidName(uuidPairMatch[2]);
        return `${name1}_${name2} Room`;
      }

      // Already a clean name (new format: "Alice_Bob Room" or "Own_Alice_messages")
      return n;
    }

    if (actualRoom.type === 'one_to_one' || actualRoom.type === 'ONE_ONE') {
      const ownerName = userMap[actualRoom.owner_id]?.name || (actualRoom.owner_id?.substring(0, 8) || 'direct');
      return `${ownerName} Room`;
    }

    return 'Direct Chat';
  };

  // Group messages by room
  const categorizedMessages = useMemo(() => {
    const groups: Record<string, any[]> = {};
    messages.forEach((msg) => {
      const rId = msg.chatRoomId || 'unassigned';
      if (!groups[rId]) {
        groups[rId] = [];
      }
      groups[rId].push(msg);
    });
    return groups;
  }, [messages]);

  // List of room IDs with messages
  const roomIdsWithMessages = useMemo(() => {
    return Object.keys(categorizedMessages);
  }, [categorizedMessages]);

  const toggleRoomExpand = (roomId: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  const deleteUser = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete User Account',
      message: 'Are you sure you want to permanently delete this user? All their data and messages will be removed. This action cannot be undone.',
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const deleteRoom = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Room / Group',
      message: 'Are you sure you want to delete this room/group? All messages and attachments will be permanently lost.',
      confirmText: 'Delete Room',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/rooms/${id}`, { method: 'DELETE' });
      toast.success('Room deleted successfully');
      loadRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  const softDeleteMessage = async (id: string) => {
    const confirmed = await confirm({
      title: 'Soft Delete Message',
      message: 'This will mark the message as deleted for users (displaying "Message Deleted" in chat), but retains the content in the database for admin records. Continue?',
      confirmText: 'Soft Delete',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/messages/${id}`, { method: 'DELETE' });
      toast.success('Message soft-deleted successfully');
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to soft delete message');
    }
  };

  const realDeleteMessage = async (id: string) => {
    const confirmed = await confirm({
      title: 'Permanently Erase Message',
      message: 'This will permanently destroy this message and its data from the database. This action CANNOT be undone. Continue?',
      confirmText: 'Permanent Real Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/messages/${id}/permanent`, { method: 'DELETE' });
      toast.success('Message permanently deleted from database');
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to permanently delete message');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  });

  // Filter rooms
  const filteredRooms = rooms.filter((r) => {
    if (!roomSearchQuery) return true;
    const q = roomSearchQuery.toLowerCase();
    const cleanName = formatRoomName(r).toLowerCase();
    const ownerName = (userMap[r.owner_id]?.name || '').toLowerCase();
    return (
      cleanName.includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      ownerName.includes(q)
    );
  });

  return (
    <>
      <Head>
        <title>Sunday - Admin Dashboard</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/tab-logo.png" />
      </Head>

      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <img
              src="/logo.png"
              alt="Sunday"
              style={styles.sidebarLogoImg}
            />
            <div>
              <h2 style={styles.sidebarTitle}>Sunday</h2>
              <span style={styles.sidebarBadge}>ADMIN PANEL</span>
            </div>
          </div>

          <nav style={styles.nav}>
            <button
              onClick={() => setActiveTab('stats')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'stats' ? styles.navItemActive : {}),
              }}
            >
              <BarChart3 size={18} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'users' ? styles.navItemActive : {}),
              }}
            >
              <Users size={18} />
              <span>Users</span>
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'rooms' ? styles.navItemActive : {}),
              }}
            >
              <Hash size={18} />
              <span>Rooms/Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              style={{
                ...styles.navItem,
                ...(activeTab === 'messages' ? styles.navItemActive : {}),
              }}
            >
              <MessageSquare size={18} />
              <span>Messages</span>
            </button>
          </nav>

          <button onClick={signOut} style={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </aside>

        {/* Main Content */}
        <main style={styles.main}>
          <div style={styles.mainHeader}>
            <div>
              <h1 style={styles.mainTitle}>
                {activeTab === 'stats' && 'Dashboard Overview'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'rooms' && 'Rooms & Direct Chats'}
                {activeTab === 'messages' && 'Messages Monitor'}
              </h1>
              <p style={styles.mainSubtitle}>
                {activeTab === 'stats' && 'Real-time overview of platform statistics and usage'}
                {activeTab === 'users' && 'View, search, and manage registered Sunday users'}
                {activeTab === 'rooms' && 'Monitor all 1-on-1 chats, saved messages, and group rooms'}
                {activeTab === 'messages' && 'Inspect messages categorized by room with full sender details'}
              </p>
            </div>
          </div>

          <div style={styles.content}>
            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, backgroundColor: '#FFF0EB' }}>
                    <Users size={24} color="#FF5A36" />
                  </div>
                  <div>
                    <p style={styles.statLabel}>Total Users</p>
                    <p style={styles.statValue}>{stats.totalUsers}</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, backgroundColor: '#EFF6FF' }}>
                    <Hash size={24} color="#3B82F6" />
                  </div>
                  <div>
                    <p style={styles.statLabel}>Total Rooms</p>
                    <p style={styles.statValue}>{stats.totalRooms}</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIcon, backgroundColor: '#F0FDF4' }}>
                    <MessageSquare size={24} color="#22C55E" />
                  </div>
                  <div>
                    <p style={styles.statLabel}>Total Messages</p>
                    <p style={styles.statValue}>{stats.totalMessages}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div style={styles.searchBarWrapper}>
                  <Search size={16} color="#8A94A6" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or ID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    style={styles.searchBarInput}
                  />
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>User</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>User ID</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id || u._id} style={styles.tr}>
                          <td style={styles.td}>
                            <div style={styles.userCell}>
                              <img
                                src={
                                  u.profile?.profile_picture ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=FF5A36&color=fff&size=64`
                                }
                                alt={u.name}
                                style={styles.cellAvatar}
                              />
                              <span style={{ fontWeight: 600, color: '#1C2024' }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={styles.td}>{u.email}</td>
                          <td style={styles.td}>
                            <code style={styles.idCode}>{u.id || u._id}</code>
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                ...(u.role === 'admin' ? styles.adminBadge : {}),
                              }}
                            >
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => deleteUser(u.id || u._id)}
                              style={styles.deleteBtn}
                              disabled={u.id === user.id}
                              title="Delete User"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} style={styles.emptyTd}>
                            No users match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <div style={styles.searchBarWrapper}>
                  <Search size={16} color="#8A94A6" />
                  <input
                    type="text"
                    placeholder="Search rooms by name, owner, or ID..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    style={styles.searchBarInput}
                  />
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Room Name</th>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Room ID</th>
                        <th style={styles.th}>Owner</th>
                        <th style={styles.th}>Created</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map((r) => {
                        const cleanName = formatRoomName(r);
                        const owner = userMap[r.owner_id];
                        const ownerDisplayName = owner ? `${owner.name} (${r.owner_id?.substring(0, 8)}...)` : (r.owner_id || 'Unknown');

                        return (
                          <tr key={r.id || r._id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={styles.roomTypeIcon}>
                                  {r.type === 'group' || r.type === 'GROUP' ? (
                                    <Layers size={15} color="#FF5A36" />
                                  ) : (
                                    <MessageCircle size={15} color="#3B82F6" />
                                  )}
                                </div>
                                <span style={{ fontWeight: 600, color: '#1C2024' }}>
                                  {cleanName}
                                </span>
                              </div>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.badge}>{r.type}</span>
                            </td>
                            <td style={styles.td}>
                              <code style={styles.idCode}>{r.id || r._id}</code>
                            </td>
                            <td style={styles.td}>{ownerDisplayName}</td>
                            <td style={styles.td}>
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => deleteRoom(r.id || r._id)}
                                style={styles.deleteBtn}
                                title="Delete Room"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRooms.length === 0 && (
                        <tr>
                          <td colSpan={6} style={styles.emptyTd}>
                            No rooms match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Messages Tab - Categorized by Room */}
            {activeTab === 'messages' && (
              <div style={styles.messagesSection}>
                {/* Search & Filter Header */}
                <div style={styles.messagesHeaderControls}>
                  <div style={styles.searchBarWrapper}>
                    <Search size={16} color="#8A94A6" />
                    <input
                      type="text"
                      placeholder="Search messages by content, sender name, or room..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      style={styles.searchBarInput}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const allExpanded = roomIdsWithMessages.every((id) => expandedRooms[id]);
                        const next: Record<string, boolean> = {};
                        roomIdsWithMessages.forEach((id) => {
                          next[id] = !allExpanded;
                        });
                        setExpandedRooms(next);
                      }}
                      style={styles.actionBtnOutline}
                    >
                      {roomIdsWithMessages.every((id) => expandedRooms[id]) ? 'Collapse All' : 'Expand All'}
                    </button>
                  </div>
                </div>

                {/* Rooms Accordion / Categorized View */}
                <div style={styles.roomCategoriesList}>
                  {roomIdsWithMessages.map((roomId) => {
                    const roomMsgs = categorizedMessages[roomId] || [];
                    const roomObj = roomMap[roomId];
                    const cleanRoomName = formatRoomName(roomObj, roomId);

                    // Filter messages in this room by search
                    const filteredRoomMsgs = roomMsgs.filter((m) => {
                      if (!messageSearchQuery) return true;
                      const q = messageSearchQuery.toLowerCase();
                      const sender = userMap[m.senderId];
                      const senderName = (sender?.name || '').toLowerCase();
                      const content = (m.content || '').toLowerCase();
                      const rName = cleanRoomName.toLowerCase();
                      return (
                        content.includes(q) ||
                        senderName.includes(q) ||
                        rName.includes(q) ||
                        m.senderId?.toLowerCase().includes(q) ||
                        roomId.toLowerCase().includes(q)
                      );
                    });

                    if (messageSearchQuery && filteredRoomMsgs.length === 0) {
                      return null;
                    }

                    const isExpanded = expandedRooms[roomId] ?? true; // Default expanded

                    return (
                      <div key={roomId} style={styles.roomCard}>
                        {/* Room Header / Clickable Toggle */}
                        <div
                          onClick={() => toggleRoomExpand(roomId)}
                          style={styles.roomCardHeader}
                        >
                          <div style={styles.roomCardHeaderLeft}>
                            <button style={styles.expandToggleBtn}>
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            <div style={styles.roomIconWrapper}>
                              <MessageSquare size={16} color="#FF5A36" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={styles.roomCardTitle}>{cleanRoomName}</h3>
                                <span style={styles.roomMsgCountBadge}>
                                  {filteredRoomMsgs.length} {filteredRoomMsgs.length === 1 ? 'message' : 'messages'}
                                </span>
                              </div>
                              <div style={styles.roomCardMeta}>
                                <span>Room ID: <code style={styles.inlineCode}>{roomId}</code></span>
                                {roomObj?.type && (
                                  <span style={styles.miniBadge}>{roomObj.type}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Room Messages Table / List */}
                        {isExpanded && (
                          <div style={styles.roomCardBody}>
                            {filteredRoomMsgs.length === 0 ? (
                              <div style={styles.noMessagesInRoom}>
                                <span>No messages found in this room.</span>
                              </div>
                            ) : (
                              <table style={styles.table}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Sender</th>
                                    <th style={styles.th}>Message Content</th>
                                    <th style={styles.th}>Room Details</th>
                                    <th style={styles.th}>Sent At</th>
                                    <th style={styles.th}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredRoomMsgs.map((m) => {
                                    const sender = userMap[m.senderId];
                                    const senderName = sender?.name || 'Unknown User';
                                    const senderAvatar =
                                      sender?.profile?.profile_picture ||
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=FF5A36&color=fff&size=64`;

                                    return (
                                      <tr key={m._id || m.id} style={styles.tr}>
                                        {/* Sender Name instead of raw ID */}
                                        <td style={styles.td}>
                                          <div style={styles.senderCell}>
                                            <img
                                              src={senderAvatar}
                                              alt={senderName}
                                              style={styles.cellAvatarSmall}
                                            />
                                            <div>
                                              <div style={{ fontWeight: 600, color: '#1C2024', fontSize: '13px' }}>
                                                {senderName}
                                              </div>
                                              <div style={{ fontSize: '11px', color: '#8A94A6' }}>
                                                ID: {m.senderId?.substring(0, 8)}...
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Content */}
                                        <td style={styles.td}>
                                          {m.isDeleted ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700, width: 'fit-content' }}>
                                                <EyeOff size={12} />
                                                <span>Soft Deleted (Users see: "Message Deleted")</span>
                                              </div>
                                              <p style={{ ...styles.messageContentText, color: '#334155', fontStyle: 'italic', margin: '2px 0' }}>
                                                {m.content || '(Empty text)'}
                                              </p>
                                              {m.fileUrl && (
                                                <div style={styles.attachmentBadge}>
                                                  <FileText size={12} />
                                                  <span>Attachment</span>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div>
                                              <p style={styles.messageContentText}>{m.content}</p>
                                              {m.fileUrl && (
                                                <div style={styles.attachmentBadge}>
                                                  <FileText size={12} />
                                                  <span>Attachment</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </td>

                                        {/* Room Name and Room ID */}
                                        <td style={styles.td}>
                                          <div>
                                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C2024' }}>
                                              {cleanRoomName}
                                            </div>
                                            <code style={styles.idCodeSmall}>{roomId}</code>
                                          </div>
                                        </td>

                                        {/* Timestamp */}
                                        <td style={styles.td}>
                                          <div style={styles.timeCell}>
                                            <Clock size={13} color="#8A94A6" />
                                            <span>
                                              {m.createdAt
                                                ? new Date(m.createdAt).toLocaleString([], {
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                  })
                                                : '-'}
                                            </span>
                                          </div>
                                        </td>

                                        {/* Delete Action: Soft & Real Delete */}
                                        <td style={styles.td}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {!m.isDeleted && (
                                              <button
                                                onClick={() => softDeleteMessage(m._id || m.id)}
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  padding: '5px 8px',
                                                  borderRadius: '6px',
                                                  border: '1px solid #FED7AA',
                                                  backgroundColor: '#FFF7ED',
                                                  color: '#EA580C',
                                                  fontSize: '11px',
                                                  fontWeight: 600,
                                                  cursor: 'pointer',
                                                }}
                                                title="Soft Delete (Displays 'Message Deleted' to users)"
                                              >
                                                <EyeOff size={12} />
                                                <span>Soft Delete</span>
                                              </button>
                                            )}
                                            <button
                                              onClick={() => realDeleteMessage(m._id || m.id)}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '5px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid #FECACA',
                                                backgroundColor: '#FEF2F2',
                                                color: '#DC2626',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                              }}
                                              title="Real Delete (Permanently remove from database)"
                                            >
                                              <Trash2 size={12} />
                                              <span>{m.isDeleted ? 'Purge DB' : 'Real Delete'}</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {roomIdsWithMessages.length === 0 && (
                    <div style={styles.emptyStateContainer}>
                      <MessageSquare size={36} color="#CCD2DC" />
                      <p style={styles.emptyStateTitle}>No messages found</p>
                      <p style={styles.emptyStateSubtitle}>Messages sent by users will appear categorized here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading && (
              <div style={styles.loading}>
                <div style={styles.spinner} />
                <p>Loading data...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F8F9FB',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E8ECEF',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    paddingLeft: '6px',
  },
  sidebarLogoImg: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    objectFit: 'contain',
    boxShadow: '0 2px 8px rgba(255, 90, 54, 0.2)',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#1C2024',
    lineHeight: 1.2,
  },
  sidebarBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#FF5A36',
    letterSpacing: '0.6px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#737D8C',
    backgroundColor: 'transparent',
    textAlign: 'left',
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: 'none',
  },
  navItemActive: {
    backgroundColor: '#FFF5F2',
    color: '#FF5A36',
    fontWeight: 600,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    marginTop: '12px',
    cursor: 'pointer',
    border: 'none',
  },
  main: {
    flex: 1,
    padding: '32px 40px',
    overflow: 'auto',
  },
  mainHeader: {
    marginBottom: '28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#1C2024',
    letterSpacing: '-0.5px',
  },
  mainSubtitle: {
    fontSize: '14px',
    color: '#737D8C',
    marginTop: '4px',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    border: '1px solid #ECEFF2',
    minHeight: '500px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    borderRadius: '14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E8ECEF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  statIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#8A94A6',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '30px',
    fontWeight: 800,
    color: '#1C2024',
  },
  searchBarWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#F5F6F8',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '20px',
    maxWidth: '450px',
    border: '1px solid #E8ECEF',
  },
  searchBarInput: {
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '13px',
    color: '#1C2024',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#8A94A6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #E8ECEF',
    backgroundColor: '#FAFBFD',
  },
  tr: {
    borderBottom: '1px solid #F0F2F5',
  },
  td: {
    padding: '14px',
    fontSize: '13px',
    color: '#1C2024',
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: '36px',
    textAlign: 'center',
    color: '#8A94A6',
    fontSize: '14px',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  senderCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cellAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  cellAvatarSmall: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  roomTypeIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: '#F5F6F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#F0F2F5',
    color: '#4E5969',
    textTransform: 'uppercase',
  },
  adminBadge: {
    backgroundColor: '#FFF0EB',
    color: '#FF5A36',
  },
  miniBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: '#E8ECEF',
    color: '#555',
    textTransform: 'uppercase',
  },
  idCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#F5F6F8',
    padding: '3px 6px',
    borderRadius: '4px',
    color: '#555',
  },
  idCodeSmall: {
    fontFamily: 'monospace',
    fontSize: '11px',
    backgroundColor: '#F5F6F8',
    padding: '2px 5px',
    borderRadius: '4px',
    color: '#777',
    display: 'inline-block',
    marginTop: '2px',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: '11px',
    backgroundColor: '#E8ECEF',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#333',
  },
  deleteBtn: {
    padding: '7px 9px',
    borderRadius: '6px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  },
  actionBtnOutline: {
    padding: '8px 14px',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D0D5DD',
    color: '#344054',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    height: '40px',
  },
  messagesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  messagesHeaderControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  roomCategoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  roomCard: {
    border: '1px solid #E4E7EC',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  roomCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#FAFBFD',
    cursor: 'pointer',
    borderBottom: '1px solid #ECEFF2',
    userSelect: 'none',
  },
  roomCardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  expandToggleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#737D8C',
    display: 'flex',
    alignItems: 'center',
  },
  roomIconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FFF0EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCardTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1C2024',
  },
  roomMsgCountBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#FFEFEA',
    color: '#FF5A36',
  },
  roomCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: '#737D8C',
    marginTop: '3px',
  },
  roomCardBody: {
    padding: '0',
  },
  noMessagesInRoom: {
    padding: '24px',
    textAlign: 'center',
    color: '#8A94A6',
    fontSize: '13px',
  },
  messageContentText: {
    fontSize: '13px',
    color: '#1C2024',
    lineHeight: 1.4,
    maxWidth: '400px',
    wordBreak: 'break-word',
  },
  attachmentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: '11px',
    fontWeight: 600,
  },
  timeCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#737D8C',
    whiteSpace: 'nowrap',
  },
  emptyStateContainer: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyStateTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1C2024',
    marginTop: '8px',
  },
  emptyStateSubtitle: {
    fontSize: '13px',
    color: '#8A94A6',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '12px',
    color: '#8A94A6',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #F0F2F5',
    borderTop: '3px solid #FF5A36',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
