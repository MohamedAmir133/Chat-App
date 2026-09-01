import React, { useState } from 'react';
import Head from 'next/head';
import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatView } from '@/components/chat/ChatView';
import { EmptyState } from '@/components/chat/EmptyState';
import { AuthModal } from '@/components/auth/AuthModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { useChat } from '@/context/ChatContext';

export default function Home() {
  const { activeConversation } = useChat();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
          <Sidebar onOpenAuth={() => setIsAuthOpen(true)} />

          {/* Right Active Chat or Empty State */}
          <section style={styles.contentSection}>
            {activeConversation ? <ChatView /> : <EmptyState />}
          </section>
        </div>

        {/* Modals */}
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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
};
