'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Users, UserPlus, Search, Loader2, UserMinus, Shield, Camera, Edit2, Check } from 'lucide-react';
import { User, Conversation } from '@/types';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

async function uploadImageToCloud(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'chat-app-groups');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    );

    if (response.ok) {
      const data = await response.json();
      return data.secure_url;
    }
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
  }
  
  throw new Error('Failed to upload image');
}

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
}

export function GroupProfileModal({ isOpen, onClose, conversation }: GroupProfileModalProps) {
  const { user: currentUser } = useAuth();
  const { refreshRoomsRef } = useChat();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = React.useMemo(() => {
    if (!currentUser || !conversation?.members) return false;
    const me = conversation.members.find(m => m.id === currentUser.id);
    return me?.role === 'owner';
  }, [currentUser, conversation]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('members');
      setSearchQuery('');
      setSearchResults([]);
      setIsEditingName(false);
      setIsEditingDescription(false);
    } else if (conversation) {
      setEditedName(conversation.user.name);
      setEditedDescription(conversation.user.bio || '');
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    if (activeTab !== 'add' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiRequest<User[]>(`/user/search?q=${encodeURIComponent(searchQuery)}`);
        // Filter out people already in the group
        const existingIds = new Set(conversation?.members?.map(m => m.id) || []);
        setSearchResults(results.filter((u) => !existingIds.has(u.id)));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab, conversation?.members]);

  const handleAddMember = async (targetUser: User) => {
    if (!conversation?.roomId || actionLoading) return;
    setActionLoading(`add-${targetUser.id}`);
    
    try {
      await apiRequest(`/rooms/${conversation.roomId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: [targetUser.id] }),
      });
      toast.success(`${targetUser.name} added to group`);
      // Refresh rooms in context to update members
      refreshRoomsRef.current(true);
      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.id !== targetUser.id));
    } catch (err) {
      console.error('Failed to add member:', err);
      toast.error('Failed to add member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (targetId: string, memberName?: string) => {
    if (!conversation?.roomId || actionLoading) return;

    const confirmed = await confirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName || 'this member'} from the group?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    setActionLoading(`remove-${targetId}`);
    
    try {
      await apiRequest(`/rooms/${conversation.roomId}/members/${targetId}`, {
        method: 'DELETE',
      });
      toast.success('Member removed from group');
      refreshRoomsRef.current(true);
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error('Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!conversation?.roomId || !editedName.trim() || editedName === conversation.user.name) {
      setIsEditingName(false);
      return;
    }
    
    setActionLoading('update-name');
    try {
      await apiRequest(`/rooms/${conversation.roomId}/info`, {
        method: 'PUT',
        body: JSON.stringify({ name: editedName.trim() }),
      });
      toast.success('Group name updated');
      refreshRoomsRef.current(true);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update group name:', err);
      toast.error('Failed to update group name');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateGroupDescription = async () => {
    if (!conversation?.roomId || editedDescription === (conversation.user.bio || '')) {
      setIsEditingDescription(false);
      return;
    }
    
    setActionLoading('update-description');
    try {
      await apiRequest(`/rooms/${conversation.roomId}/info`, {
        method: 'PUT',
        body: JSON.stringify({ description: editedDescription.trim() }),
      });
      toast.success('Group description updated');
      refreshRoomsRef.current(true);
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Failed to update group description:', err);
      toast.error('Failed to update group description');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation?.roomId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadImageToCloud(file);
      await apiRequest(`/rooms/${conversation.roomId}/info`, {
        method: 'PUT',
        body: JSON.stringify({ group_picture: imageUrl }),
      });
      toast.success('Group photo updated');
      refreshRoomsRef.current(true);
    } catch (err) {
      console.error('Failed to upload group image:', err);
      toast.error('Failed to upload group image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen || !conversation) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBadge}>
              <Users size={20} color="#FF5A36" />
            </div>
            <h3 style={styles.title}>Group Info</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color="#737D8C" />
          </button>
        </div>

        {/* Group Hero */}
        <div style={styles.heroSection}>
          {/* Group Avatar with Upload */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '10px',
              position: 'relative',
            }}>
              {conversation.user.profile_picture ? (
                <img src={conversation.user.profile_picture} alt={conversation.user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px' }}>👥</span>
              )}
              
              {/* Upload overlay for owner */}
              {isOwner && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#FF5A36',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUploadingImage ? 'not-allowed' : 'pointer',
                      border: '2px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                    title="Change group image"
                  >
                    {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Group Name with Edit */}
          {isEditingName && isOwner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateGroupName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                maxLength={50}
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1C2024',
                  border: '2px solid #FF5A36',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  textAlign: 'center',
                  outline: 'none',
                  width: '260px',
                }}
              />
              <button
                onClick={handleUpdateGroupName}
                disabled={actionLoading === 'update-name'}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {actionLoading === 'update-name' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={styles.userName}>{conversation.user.name}</h2>
              {isOwner && (
                <button
                  onClick={() => setIsEditingName(true)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#F5F6F8',
                    color: '#737D8C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  title="Edit group name"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )}
          
          <p style={{ color: '#8A94A6', fontSize: '14px', marginTop: '4px' }}>
            {conversation.memberCount} members
          </p>
          
          {/* Group Description with Edit */}
          {isEditingDescription && isOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', width: '100%', maxWidth: '300px' }}>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditingDescription(false);
                }}
                placeholder="Add a group description..."
                maxLength={200}
                rows={3}
                autoFocus
                style={{
                  fontSize: '13px',
                  color: '#525C6E',
                  border: '2px solid #FF5A36',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  outline: 'none',
                  resize: 'none',
                  width: '100%',
                  lineHeight: '1.5',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsEditingDescription(false)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#F5F6F8',
                    color: '#737D8C',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroupDescription}
                  disabled={actionLoading === 'update-description'}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#22C55E',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {actionLoading === 'update-description' ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '10px', maxWidth: '300px' }}>
              {conversation.user.bio ? (
                <p style={{ color: '#525C6E', fontSize: '13px', textAlign: 'center', lineHeight: '1.5', flex: 1 }}>
                  {conversation.user.bio}
                </p>
              ) : isOwner ? (
                <p style={{ color: '#9BA3AF', fontSize: '13px', textAlign: 'center', fontStyle: 'italic', flex: 1 }}>
                  No description yet
                </p>
              ) : null}
              {isOwner && (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#F5F6F8',
                    color: '#737D8C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: 'none',
                    flexShrink: 0,
                  }}
                  title="Edit group description"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )}
          
          {/* Leave group button for non-owners */}
          {!isOwner && (
            <button
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Leave Group',
                  message: `Are you sure you want to leave "${conversation.user.name}"? You will no longer receive messages from this group.`,
                  confirmText: 'Leave Group',
                  cancelText: 'Cancel',
                  type: 'danger',
                });

                if (!confirmed) return;

                try {
                  await apiRequest(`/rooms/${conversation.roomId}/leave`, { method: 'DELETE' });
                  toast.success('You left the group');
                  refreshRoomsRef.current(true);
                  onClose();
                } catch (err) {
                  console.error('Failed to leave group:', err);
                  toast.error('Failed to leave group');
                }
              }}
              style={{
                marginTop: '12px',
                padding: '8px 20px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid #FECACA',
              }}
            >
              Leave Group
            </button>
          )}
        </div>

        {/* Tabs */}
        {isOwner && (
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'members' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'add' ? styles.activeTab : {}) }}
              onClick={() => setActiveTab('add')}
            >
              Add Users
            </button>
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'members' ? (
            <div style={styles.list}>
              {conversation.members?.map((member) => (
                <div key={member.id} style={styles.listItem}>
                  <img
                    src={member.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FF5A36&color=fff`}
                    alt={member.name}
                    style={styles.avatar}
                  />
                  <div style={styles.userInfo}>
                    <p style={styles.name}>
                      {member.name} {member.id === currentUser?.id && '(You)'}
                    </p>
                    <p style={styles.email}>
                      {member.role === 'owner' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8B5CF6' }}>
                          <Shield size={12} /> Owner
                        </span>
                      ) : member.email}
                    </p>
                  </div>
                  {isOwner && member.id !== currentUser?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      style={styles.actionBtnRed}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `remove-${member.id}` ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={styles.searchBox}>
                <Search size={18} color="#8A94A6" />
                <input
                  type="text"
                  placeholder="Search users to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                  autoFocus
                />
                {searching && <Loader2 size={16} color="#FF5A36" className="animate-spin" />}
              </div>
              
              <div style={{ ...styles.list, flex: 1, marginTop: '12px' }}>
                {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                  <p style={{ textAlign: 'center', color: '#8A94A6', padding: '20px' }}>No users found</p>
                )}
                {searchResults.map((user) => (
                  <div key={user.id} style={styles.listItem}>
                    <img
                      src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF5A36&color=fff`}
                      alt={user.name}
                      style={styles.avatar}
                    />
                    <div style={styles.userInfo}>
                      <p style={styles.name}>{user.name}</p>
                      <p style={styles.email}>{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleAddMember(user)}
                      style={styles.actionBtn}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `add-${user.id}` ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
    animation: 'fadeIn 0.15s ease',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '400px',
    height: '600px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #F0F2F5',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FFF5F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1C2024',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    cursor: 'pointer',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #F0F2F5',
  },
  userName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1C2024',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #F0F2F5',
  },
  tab: {
    flex: 1,
    padding: '14px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#737D8C',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  activeTab: {
    color: '#FF5A36',
    borderBottom: '2px solid #FF5A36',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 20px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderRadius: '12px',
    backgroundColor: '#F8F9FB',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1C2024',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  email: {
    fontSize: '12px',
    color: '#8A94A6',
    marginTop: '2px',
  },
  actionBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#FFF5F2',
    color: '#FF5A36',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  actionBtnRed: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #E8ECEF',
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#1C2024',
    outline: 'none',
  },
};
