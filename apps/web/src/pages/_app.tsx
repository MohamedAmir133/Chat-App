import type { AppProps } from 'next/app';
import '@/app/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ToastProvider } from '@/context/ToastContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <ChatProvider>
          <Component {...pageProps} />
        </ChatProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
