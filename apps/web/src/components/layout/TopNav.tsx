'use client';

import React from 'react';
import { Search, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';

interface TopNavProps {
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export function TopNav({ onOpenAuth, onOpenProfile }: TopNavProps) {
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useChat();

  return (
    <header style={styles.header}>
      {/* Brand Logo */}
      <div style={styles.brand}>
        <div style={styles.logoBadge}>
          <span style={styles.logoLetter}>S</span>
        </div>
        <span style={styles.brandName}>Sunday</span>
      </div>

      {/* Global Search Bar */}
      <div style={styles.searchContainerOuter}>
        <div style={styles.searchContainer}>
          <Search size={17} color="#8A94A6" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search users to chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Profile / Sign In */}
      <div style={styles.actions}>
        {user ? (
          <div
            onClick={onOpenProfile}
            style={styles.profileBtn}
            title={`${user.name} (${user.email})`}
          >
            <img
              src={
                user.profile_picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF5A36&color=fff&size=80`
              }
              alt={user.name}
              style={styles.avatarImg}
            />
            <span style={styles.onlineBadge} />
          </div>
        ) : (
          <button onClick={onOpenAuth} style={styles.signInBtn}>
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    marginBottom: '16px',
    gap: '20px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: '#FFF0EB',
    border: '1px solid #FFE0D6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FF5A36',
    fontWeight: 800,
    fontSize: '20px',
  },
  logoLetter: {
    color: '#FF5A36',
    fontFamily: 'inherit',
  },
  brandName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1C2024',
    letterSpacing: '-0.4px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: '9999px',
    padding: '8px 16px',
    width: '100%',
    maxWidth: '420px',
    gap: '10px',
    transition: 'all 0.2s',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    backgroundColor: 'transparent',
    width: '100%',
    fontSize: '14px',
    color: '#1C2024',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBtn: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    transition: 'background-color 0.2s',
  },
  notificationDot: {
    position: 'absolute',
    top: '10px',
    right: '11px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#FF5A36',
  },
  profileBtn: {
    position: 'relative',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    padding: '2px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: '0px',
    right: '0px',
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
    border: '2px solid #FFFFFF',
  },
  signInBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 18px',
    borderRadius: '9999px',
    background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(255, 90, 54, 0.25)',
  },
  searchContainerOuter: {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    marginTop: '8px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    padding: '8px',
    zIndex: 50,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '12px',
    cursor: 'pointer',
    gap: '12px',
    transition: 'background-color 0.2s',
  },
  dropdownAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  dropdownInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1C2024',
  },
  dropdownEmail: {
    fontSize: '12px',
    color: '#737D8C',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(0,0,0,0.1)',
    borderTopColor: '#FF5A36',
    borderRadius: '50%',
    marginRight: '8px',
  },
};
