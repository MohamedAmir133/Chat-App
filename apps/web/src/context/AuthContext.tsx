'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { apiRequest } from '@/lib/api';
import { useToast } from './ToastContext';

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
  refreshUser: (updateLoadingState?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // ─── Fetch full profile from /user/me ─────────────────────────────────────
  // Uses a soft-fail: if profile isn't found yet, keeps the minimal user data
  const refreshUser = async (updateLoadingState = true) => {
    try {
      console.log('[AuthContext] refreshUser: fetching /user/me');
      const data = await apiRequest<any>('/user/me');
      console.log('[AuthContext] refreshUser: received data:', data);
      if (!data) return;
      // The user service returns { userId, name, email, ... }
      const id = data.id || data.userId;
      if (!id) return;
      const updatedUser = {
        id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || 'user',
        profile_picture: data.profile_picture,
        bio: data.bio,
        phone_number: data.phone_number,
        country: data.country,
        state: data.state,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        isOnline: data.isOnline ?? true,
      };
      console.log('[AuthContext] refreshUser: setting user state to:', updatedUser);
      setUser(updatedUser);
    } catch (err: any) {
      // If profile not found yet (404 / RpcException), keep current user state
      console.warn('refreshUser:', err?.message);
    } finally {
      if (updateLoadingState) setIsLoading(false);
    }
  };

  // On mount — try to restore session from cookie
  useEffect(() => {
    refreshUser();
  }, []);

  // ─── Sign In ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiRequest<any>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('[AuthContext] signIn response:', result);

      // Set minimal user from signin response so UI updates immediately
      if (result?.user) {
        const newUser = {
          id: result.user.id,
          name: result.user.name || '',
          email: result.user.email || '',
          role: result.user.role || 'user',
          isOnline: true,
        };
        console.log('[AuthContext] Setting user with role:', newUser.role);
        setUser(newUser);

        toast.success(`Welcome back, ${newUser.name}!`);

        // Redirect admin users to admin panel
        if (newUser.role === 'admin') {
          console.log('[AuthContext] Admin detected, redirecting to /admin');
          window.location.href = '/admin';
          return;
        }
      }

      // Enrich with full profile in background — errors are intentionally swallowed
      // so a slow/failing profile service never blocks the user from entering the app
      refreshUser(false).catch(() => {});
    } catch (err: any) {
      console.error('[AuthContext] signIn error:', err);
      toast.error(err.message || 'Failed to sign in. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
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
    try {
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
          role: result.user.role || 'user',
          profile_picture: payload.userProfileDto.profile_picture,
          isOnline: true,
        });
      }

      toast.success('Account created successfully! Welcome aboard!');

      // Enrich with full profile after a short delay (profile creation is async via event)
      setTimeout(() => refreshUser(false).catch(() => {}), 2000);
    } catch (err: any) {
      console.error('[AuthContext] signUp error:', err);
      toast.error(err.message || 'Failed to create account. Please try again.');
      throw err;
    }
  };

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await apiRequest('/auth/signout', { method: 'POST' });
      toast.success('Signed out successfully');
    } catch (err) {
      console.error('Sign out error', err);
      toast.error('Failed to sign out properly');
    } finally {
      setUser(null);
    }
  };

  // ─── Update Profile ────────────────────────────────────────────────────────
  const updateProfile = async (data: Partial<User>) => {
    console.log('[AuthContext] updateProfile called with:', data);
    try {
      const result = await apiRequest('/user/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('[AuthContext] updateProfile response:', result);
      await refreshUser(false);
      console.log('[AuthContext] User refreshed after update');
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('[AuthContext] updateProfile error:', err);
      toast.error('Failed to update profile. Please try again.');
      throw err;
    }
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
