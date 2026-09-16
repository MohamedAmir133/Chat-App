'use client';

import React, { useEffect, useState } from 'react';
import { X, Phone, MapPin, FileText, Mail, Circle, Loader2 } from 'lucide-react';
import { User } from '@/types';
import { apiRequest } from '@/lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // base user from conversation (name, id, isOnline)
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [fullProfile, setFullProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch full profile every time the modal opens for a user
  useEffect(() => {
    if (!isOpen || !user?.id) {
      setFullProfile(null);
      return;
    }

    setIsLoading(true);
    apiRequest<any>(`/user/${user.id}`)
      .then((data) => {
        const id = data.id || data.userId || user.id;
        setFullProfile({
          id,
          name: data.name || user.name,
          email: data.email || user.email,
          profile_picture: data.profile_picture || user.profile_picture,
          bio: data.bio,
          phone_number: data.phone_number,
          country: data.country,
          state: data.state,
          isOnline: user.isOnline, // keep real-time presence from socket
        });
      })
      .catch((err) => {
        console.warn('UserProfileModal: failed to fetch profile', err);
        // Fall back to base user data
        setFullProfile(user);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  // While loading, show base info; once loaded, show full profile
  const profile = fullProfile ?? user;
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=FF5A36&color=fff&size=150`;

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.name}'s profile`}
    >
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} style={styles.closeBtn} aria-label="Close profile">
          <X size={18} color="#737D8C" />
        </button>

        {/* Avatar & name */}
        <div style={styles.heroSection}>
          <div style={styles.avatarWrap}>
            <img
              src={profile.profile_picture || avatarFallback}
              alt={profile.name}
              style={styles.avatarImg}
            />
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: profile.isOnline ? '#22C55E' : '#9BA3AF',
              }}
            />
          </div>

          <h2 style={styles.userName}>{profile.name}</h2>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: profile.isOnline ? '#DCFCE7' : '#F3F4F6',
              color: profile.isOnline ? '#16A34A' : '#6B7280',
            }}
          >
            <Circle
              size={7}
              fill={profile.isOnline ? '#22C55E' : '#9BA3AF'}
              color={profile.isOnline ? '#22C55E' : '#9BA3AF'}
              style={{ display: 'inline', marginRight: '5px' }}
            />
            {profile.isOnline ? 'Active now' : 'Offline'}
          </span>
        </div>

        {/* Loading spinner over info rows */}
        {isLoading ? (
          <div style={styles.loadingBox}>
            <Loader2 size={22} color="#FF5A36" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={styles.loadingText}>Loading profile...</p>
          </div>
        ) : (
          <div style={styles.infoList}>
            {profile.email && (
              <div style={styles.infoRow}>
                <div style={styles.infoIconWrap}>
                  <Mail size={16} color="#FF5A36" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Email</span>
                  <p style={styles.infoValue}>{profile.email}</p>
                </div>
              </div>
            )}

            <div style={styles.infoRow}>
              <div style={styles.infoIconWrap}>
                <FileText size={16} color="#FF5A36" />
              </div>
              <div style={styles.infoText}>
                <span style={styles.infoLabel}>Bio</span>
                <p style={styles.infoValue}>{profile.bio || 'No bio provided'}</p>
              </div>
            </div>

            <div style={styles.infoRow}>
              <div style={styles.infoIconWrap}>
                <Phone size={16} color="#FF5A36" />
              </div>
              <div style={styles.infoText}>
                <span style={styles.infoLabel}>Phone</span>
                <p style={styles.infoValue}>{profile.phone_number || 'Not provided'}</p>
              </div>
            </div>

            {(profile.country || profile.state) && (
              <div style={styles.infoRow}>
                <div style={styles.infoIconWrap}>
                  <MapPin size={16} color="#FF5A36" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Location</span>
                  <p style={styles.infoValue}>
                    {[profile.state, profile.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
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
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    padding: '32px 28px 28px 28px',
    width: '100%',
    maxWidth: '360px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    animation: 'slideUp 0.2s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#F5F6F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '24px',
    borderBottom: '1px solid #F0F2F5',
    marginBottom: '20px',
  },
  avatarWrap: {
    position: 'relative',
    width: '90px',
    height: '90px',
    marginBottom: '4px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #FFF0EB',
    boxShadow: '0 4px 16px rgba(255, 90, 54, 0.18)',
  },
  statusDot: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2.5px solid #FFFFFF',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },
  userName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1C2024',
    letterSpacing: '-0.3px',
    textAlign: 'center',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '24px 0',
  },
  loadingText: {
    fontSize: '13px',
    color: '#9BA3AF',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '12px 14px',
    backgroundColor: '#F8F9FB',
    borderRadius: '14px',
  },
  infoIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: '#FFF0EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9BA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1C2024',
    fontWeight: 500,
    wordBreak: 'break-word',
  },
};
