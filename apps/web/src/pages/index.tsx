import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatView } from '@/components/chat/ChatView';
import { EmptyState } from '@/components/chat/EmptyState';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { UserProfileModal } from '@/components/profile/UserProfileModal';
import { CreateGroupModal } from '@/components/group/CreateGroupModal';
import { GroupProfileModal } from '@/components/group/GroupProfileModal';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { activeConversation, refreshRooms } = useChat();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupProfileOpen, setIsGroupProfileOpen] = useState(false);

  const handleViewProfile = (user: User) => {
    if (activeConversation?.isGroup) {
      setIsGroupProfileOpen(true);
    } else {
      setViewingUser(user);
    }
  };

  // Auto-open auth modal if user is not signed in (after initial load)
  useEffect(() => {
    if (!isLoading && !user) {
      setIsAuthOpen(true);
      // Don't show toast here - it's obvious from the modal
    } else if (user) {
      // Close auth modal when user signs in
      setIsAuthOpen(false);
      
      // Redirect admin users to admin panel
      console.log('[Home] User role:', user.role);
      if (user.role === 'admin') {
        console.log('[Home] Redirecting admin to /admin');
        router.push('/admin');
      }
    }
  }, [isLoading, user, router]);

  // Show loading state during initial auth check
  if (isLoading) {
    return (
      <>
        <Head>
          <title>Sunday - Fast, Simple 1-on-1 Chat</title>
        </Head>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sunday - Fast, Simple 1-on-1 Chat</title>
        <meta name="description" content="A modern, elegant 1-on-1 chat experience with real-time presence and seamless messaging." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main style={styles.mainContainer}>
        {/* Top Header Bar */}
        <TopNav
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* Main Chat App Area */}
        <div style={styles.chatAreaWrapper}>
          {/* Left Messages Sidebar */}
          <Sidebar
            onOpenAuth={() => setIsAuthOpen(true)}
            onViewProfile={handleViewProfile}
            onCreateGroup={() => setIsGroupModalOpen(true)}
          />

          {/* Right Active Chat or Empty State */}
          <section style={styles.contentSection}>
            {activeConversation
              ? <ChatView onViewProfile={handleViewProfile} />
              : <EmptyState />}
          </section>
        </div>

        {/* Modals */}
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => {
            if (user) setIsAuthOpen(false);
          }} 
        />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        <UserProfileModal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          user={viewingUser}
        />
        <GroupProfileModal
          isOpen={isGroupProfileOpen}
          onClose={() => setIsGroupProfileOpen(false)}
          conversation={activeConversation}
        />
        <CreateGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onGroupCreated={() => {
            setIsGroupModalOpen(false);
            refreshRooms();
          }}
        />
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mainContainer: {
    width: '100%',
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  chatAreaWrapper: {
    display: 'flex',
    gap: '20px',
    flex: 1,
    alignItems: 'stretch',
  },
  contentSection: {
    flex: 1,
    display: 'flex',
    minWidth: 0,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #F0F2F5',
    borderTop: '4px solid #FF5A36',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#8A94A6',
  },
};
