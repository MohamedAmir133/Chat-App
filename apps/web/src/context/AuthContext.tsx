'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { apiRequest } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    signUpDTO: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    };
    userProfileDto: {
      bio?: string;
      profile_picture?: string;
      phone_number?: string;
      date_of_birth?: string;
      gender?: string;
      country?: string;
      state?: string;
    };
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Fetch full profile from /user/me ─────────────────────────────────────
  // Uses a soft-fail: if profile isn't found yet, keeps the minimal user data
  const refreshUser = async () => {
    try {
      const data = await apiRequest<any>('/user/me');
      if (!data) return;
      // The user service returns { userId, name, email, ... }
      const id = data.id || data.userId;
      if (!id) return;
      setUser({
        id,
        name: data.name || '',
        email: data.email || '',
        profile_picture: data.profile_picture,
        bio: data.bio,
        isOnline: data.isOnline ?? true,
      });
    } catch (err: any) {
      // If profile not found yet (404 / RpcException), keep current user state
      console.warn('refreshUser:', err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // On mount — try to restore session from cookie
  useEffect(() => {
    refreshUser();
  }, []);

  // ─── Sign In ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const result = await apiRequest<any>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Immediately set minimal user from signin response so UI updates NOW
    if (result?.user) {
      setUser({
        id: result.user.id,
        name: result.user.name || '',
        email: result.user.email || '',
        isOnline: true,
      });
    }

    // Then enrich with full profile in background (non-blocking)
    refreshUser().catch(() => {});
  };

  // ─── Sign Up ───────────────────────────────────────────────────────────────
  const signUp = async (payload: {
    signUpDTO: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    };
    userProfileDto: {
      bio?: string;
      profile_picture?: string;
      phone_number?: string;
      date_of_birth?: string;
      gender?: string;
      country?: string;
      state?: string;
    };
  }) => {
    const result = await apiRequest<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.signUpDTO.name,
        email: payload.signUpDTO.email,
        password: payload.signUpDTO.password,
        confirmPassword: payload.signUpDTO.confirmPassword,
        bio: payload.userProfileDto.bio || '',
        profile_picture: payload.userProfileDto.profile_picture || '',
        phone_number: payload.userProfileDto.phone_number || '',
        date_of_birth: payload.userProfileDto.date_of_birth || '2000-01-01',
        gender: payload.userProfileDto.gender || 'unspecified',
        country: payload.userProfileDto.country || 'Global',
        state: payload.userProfileDto.state || 'General',
      }),
    });

    // Set minimal user immediately from signup response
    if (result?.user) {
      setUser({
        id: result.user.id,
        name: result.user.name || payload.signUpDTO.name,
        email: result.user.email || payload.signUpDTO.email,
        profile_picture: payload.userProfileDto.profile_picture,
        isOnline: true,
      });
    }

    // Enrich with full profile after a short delay (profile creation is async via event)
    setTimeout(() => refreshUser().catch(() => {}), 2000);
  };

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await apiRequest('/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      setUser(null);
    }
  };

  // ─── Update Profile ────────────────────────────────────────────────────────
  const updateProfile = async (data: Partial<User>) => {
    await apiRequest('/user/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
