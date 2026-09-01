'use client';

import React, { useState } from 'react';
import { X, LogOut, Save, User, Mail, Phone, MapPin, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [bio, setBio] = useState(user?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [country, setCountry] = useState(user?.country || '');
  const [state, setState] = useState(user?.state || '');

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        bio,
        phone_number: phoneNumber,
        country,
        state,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={styles.modalCard}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>My Profile</h3>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} color="#737D8C" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div style={styles.avatarSection}>
          <div style={styles.avatarWrap}>
            <img
              src={
                user.profile_picture ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt={user.name}
              style={styles.avatarImg}
            />
            <span style={styles.onlineDot} />
          </div>

          <h4 style={styles.userName}>{user.name}</h4>
          <p style={styles.userEmail}>{user.email}</p>
          {user.role && <span style={styles.roleBadge}>{user.role}</span>}
        </div>

        {/* Form or Info Display */}
        {isEditing ? (
          <form onSubmit={handleSave} style={styles.editForm}>
            <div style={styles.inputGroup}>
              <FileText size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Bio / Headline"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <Phone size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <MapPin size={18} color="#8A94A6" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} style={styles.saveBtn}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.detailsList}>
            <div style={styles.detailRow}>
              <FileText size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Bio</span>
                <p style={styles.detailVal}>{user.bio || 'No bio provided'}</p>
              </div>
            </div>

            <div style={styles.detailRow}>
              <Phone size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Phone</span>
                <p style={styles.detailVal}>{user.phone_number || 'Not added'}</p>
              </div>
            </div>

            <div style={styles.detailRow}>
              <MapPin size={17} color="#8A94A6" />
              <div style={styles.detailText}>
                <span style={styles.detailLabel}>Location</span>
                <p style={styles.detailVal}>
                  {user.country ? `${user.state || ''}, ${user.country}` : 'Not set'}
                </p>
              </div>
            </div>

            <div style={styles.actionsFooter}>
              <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
                Edit Profile
              </button>

              <button onClick={handleSignOut} style={styles.signOutBtn}>
                <LogOut size={16} color="#EF4444" />
                <span>Sign Out</span>
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
    maxWidth: '440px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid #F0F2F5',
    marginBottom: '20px',
  },
  avatarWrap: {
    position: 'relative',
    width: '72px',
    height: '72px',
    marginBottom: '12px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  onlineDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
    border: '2px solid #FFFFFF',
  },
  userName: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#1C2024',
    marginBottom: '2px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#8A94A6',
    marginBottom: '8px',
  },
  roleBadge: {
    padding: '3px 10px',
    backgroundColor: '#FFF0EB',
    color: '#FF5A36',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '9999px',
    textTransform: 'uppercase',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '8px 12px',
    backgroundColor: '#F8F9FB',
    borderRadius: '12px',
  },
  detailText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9BA3AF',
    textTransform: 'uppercase',
  },
  detailVal: {
    fontSize: '13.5px',
    color: '#1C2024',
    fontWeight: 500,
  },
  actionsFooter: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
  },
  editBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#F4F5F8',
    color: '#1C2024',
    fontWeight: 600,
    fontSize: '14px',
    textAlign: 'center',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 18px',
    borderRadius: '12px',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    fontWeight: 600,
    fontSize: '14px',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: '12px',
    padding: '0 14px',
  },
  inputIcon: {
    marginRight: '10px',
  },
  input: {
    flex: 1,
    padding: '12px 0',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#1C2024',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#F4F5F8',
    color: '#737D8C',
    fontWeight: 600,
    fontSize: '14px',
  },
  saveBtn: {
    flex: 1,
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
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.25)',
  },
};
