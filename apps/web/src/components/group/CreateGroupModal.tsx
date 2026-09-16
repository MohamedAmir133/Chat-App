'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { User } from '@/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'members'>('info');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Group info
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  // Members
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setStep('info');
      setGroupName('');
      setDescription('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [isOpen]);

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiRequest<User[]>(`/user/search?q=${encodeURIComponent(searchQuery)}`);
        // Filter out current user
        setSearchResults(results.filter((u) => u.id !== user?.id));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user?.id]);

  const toggleMember = (member: User) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member],
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;

    setLoading(true);
    try {
      await apiRequest('/rooms/group', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName,
          description,
          memberIds: selectedMembers.map((m) => m.id),
        }),
      });

      onGroupCreated?.();
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBadge}>
              <Users size={20} color="#FF5A36" />
            </div>
            <h3 style={styles.title}>Create New Group</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color="#737D8C" />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          <div style={{ ...styles.stepDot, ...(step === 'info' ? styles.stepDotActive : {}) }}>1</div>
          <div style={styles.stepLine} />
          <div style={{ ...styles.stepDot, ...(step === 'members' ? styles.stepDotActive : {}) }}>2</div>
        </div>

        {/* Step 1: Group Info */}
        {step === 'info' && (
          <div style={styles.stepContent}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Group Name *</label>
              <input
                type="text"
                placeholder="e.g., Project Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={styles.input}
                autoFocus
                maxLength={50}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Description (Optional)</label>
              <textarea
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                maxLength={200}
              />
            </div>

            <button
              onClick={() => setStep('members')}
              disabled={!groupName.trim()}
              style={{
                ...styles.nextBtn,
                opacity: !groupName.trim() ? 0.5 : 1,
                cursor: !groupName.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Next: Add Members
            </button>
          </div>
        )}

        {/* Step 2: Add Members */}
        {step === 'members' && (
          <div style={styles.stepContent}>
            {/* Search Box */}
            <div style={styles.searchBox}>
              <Search size={18} color="#8A94A6" />
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searching && <Loader2 size={16} color="#FF5A36" className="animate-spin" />}
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div style={styles.selectedSection}>
                <p style={styles.selectedLabel}>{selectedMembers.length} member(s) selected</p>
                <div style={styles.selectedChips}>
                  {selectedMembers.map((member) => (
                    <div key={member.id} style={styles.chip}>
                      <span>{member.name}</span>
                      <button onClick={() => toggleMember(member)} style={styles.chipRemove}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            <div style={styles.resultsList}>
              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <p style={styles.emptyText}>No users found</p>
              )}
              {searchResults.map((user) => {
                const isSelected = selectedMembers.find((m) => m.id === user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user)}
                    style={{
                      ...styles.userItem,
                      backgroundColor: isSelected ? '#FFF5F2' : 'transparent',
                    }}
                  >
                    <img
                      src={
                        user.profile_picture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF5A36&color=fff`
                      }
                      alt={user.name}
                      style={styles.userAvatar}
                    />
                    <div style={styles.userInfo}>
                      <p style={styles.userName}>{user.name}</p>
                      <p style={styles.userEmail}>{user.email}</p>
                    </div>
                    {isSelected && (
                      <div style={styles.checkIcon}>
                        <Check size={16} color="#FF5A36" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={styles.actionRow}>
              <button onClick={() => setStep('info')} style={styles.backBtn}>
                Back
              </button>
              <button onClick={handleCreate} disabled={loading} style={styles.createBtn}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Create Group</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalCard: {
    maxWidth: '520px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBadge: {
    width: '40px',
    height: '40px',
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
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  stepDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#E8ECEF',
    color: '#8A94A6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
  },
  stepDotActive: {
    backgroundColor: '#FF5A36',
    color: '#FFFFFF',
  },
  stepLine: {
    width: '40px',
    height: '2px',
    backgroundColor: '#E8ECEF',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
    overflow: 'hidden',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4E5969',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #E8ECEF',
    fontSize: '14px',
    color: '#1C2024',
    backgroundColor: '#FFFFFF',
  },
  nextBtn: {
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    marginTop: '8px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #E8ECEF',
    backgroundColor: '#F8F9FB',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: '#1C2024',
  },
  selectedSection: {
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: '#FFF5F2',
    border: '1px solid #FFD5C8',
  },
  selectedLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#FF5A36',
    marginBottom: '8px',
  },
  selectedChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    backgroundColor: '#FFFFFF',
    fontSize: '12px',
    color: '#1C2024',
    border: '1px solid #FFD5C8',
  },
  chipRemove: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#FFE8E0',
    color: '#FF5A36',
  },
  resultsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '300px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1C2024',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '12px',
    color: '#8A94A6',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#FFF5F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8A94A6',
    fontSize: '13px',
    padding: '20px',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    paddingTop: '12px',
    borderTop: '1px solid #F0F2F5',
  },
  backBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#F4F5F8',
    color: '#737D8C',
    fontWeight: 600,
    fontSize: '14px',
  },
  createBtn: {
    flex: 2,
    padding: '12px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};
