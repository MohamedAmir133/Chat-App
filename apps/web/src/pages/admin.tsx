import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import { Users, MessageSquare, Hash, Trash2, Shield, LogOut, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'rooms' | 'messages'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'rooms') loadRooms();
    if (activeTab === 'messages') loadMessages();
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
      if (Array.isArray(data) && data.length === 0) {
        toast.info('No users found');
      }
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
      if (Array.isArray(data) && data.length === 0) {
        toast.info('No rooms/groups found');
      }
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
      if (Array.isArray(data) && data.length === 0) {
        toast.info('No messages found');
      }
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      toast.error('Failed to load messages list');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('⚠️ Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('⚠️ Are you sure you want to delete this room/group? All messages will be lost.')) return;
    try {
      await apiRequest(`/admin/rooms/${id}`, { method: 'DELETE' });
      toast.success('Room deleted successfully');
      loadRooms();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('⚠️ Are you sure you want to delete this message?')) return;
    try {
      await apiRequest(`/admin/messages/${id}`, { method: 'DELETE' });
      toast.success('Message deleted successfully');
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete message');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - Sunday Chat</title>
      </Head>

      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <Shield size={24} color="#FF5A36" />
            <h2 style={styles.sidebarTitle}>Admin Panel</h2>
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
            <h1 style={styles.mainTitle}>
              {activeTab === 'stats' && 'Dashboard Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'rooms' && 'Rooms & Groups'}
              {activeTab === 'messages' && 'Message Monitor'}
            </h1>
          </div>

          <div style={styles.content}>
            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>
                    <Users size={24} color="#FF5A36" />
                  </div>
                  <div>
                    <p style={styles.statLabel}>Total Users</p>
                    <p style={styles.statValue}>{stats.totalUsers}</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>
                    <Hash size={24} color="#3B82F6" />
                  </div>
                  <div>
                    <p style={styles.statLabel}>Total Rooms</p>
                    <p style={styles.statValue}>{stats.totalRooms}</p>
                  </div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statIcon}>
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
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.td}>{u.name}</td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>
                          <span style={styles.badge}>{u.role || 'user'}</span>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => deleteUser(u.id)}
                            style={styles.deleteBtn}
                            disabled={u.id === user.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Owner ID</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>{r.name || 'Direct Chat'}</td>
                        <td style={styles.td}>
                          <span style={styles.badge}>{r.type}</span>
                        </td>
                        <td style={styles.td}>{r.owner_id?.substring(0, 8)}...</td>
                        <td style={styles.td}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => deleteRoom(r.id)} style={styles.deleteBtn}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Content</th>
                      <th style={styles.th}>Sender ID</th>
                      <th style={styles.th}>Room ID</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m) => (
                      <tr key={m._id} style={styles.tr}>
                        <td style={styles.td}>
                          {m.isDeleted ? (
                            <em style={{ color: '#8A94A6' }}>Deleted</em>
                          ) : (
                            m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
                          )}
                        </td>
                        <td style={styles.td}>{m.senderId?.substring(0, 8)}...</td>
                        <td style={styles.td}>{m.chatRoomId?.substring(0, 8)}...</td>
                        <td style={styles.td}>
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => deleteMessage(m._id)}
                            style={styles.deleteBtn}
                            disabled={m.isDeleted}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {loading && (
              <div style={styles.loading}>
                <p>Loading...</p>
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
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1C2024',
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
    fontWeight: 500,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    marginTop: '12px',
  },
  main: {
    flex: 1,
    padding: '32px',
    overflow: 'auto',
  },
  mainHeader: {
    marginBottom: '24px',
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1C2024',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
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
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#F8F9FB',
    border: '1px solid #E8ECEF',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '13px',
    color: '#8A94A6',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
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
    padding: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#8A94A6',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E8ECEF',
  },
  tr: {
    borderBottom: '1px solid #F0F2F5',
  },
  td: {
    padding: '16px 12px',
    fontSize: '14px',
    color: '#1C2024',
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
  deleteBtn: {
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#8A94A6',
  },
};
