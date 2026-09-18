import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/app/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <ChatProvider>
            <Head>
              <title>Sunday</title>
              <link rel="icon" type="image/png" href="/favicon.png" />
              <link rel="shortcut icon" type="image/png" href="/favicon.png" />
              <link rel="apple-touch-icon" href="/tab-logo.png" />
            </Head>
            <Component {...pageProps} />
          </ChatProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

