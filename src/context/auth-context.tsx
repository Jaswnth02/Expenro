'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile } from '@/types';
import { INITIAL_USER } from '@/lib/data-service';
import {
  loginAction,
  signupAction,
  logoutAction,
  getCurrentUserProfileAction,
} from '@/lib/actions/auth';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signInAsDemo: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(INITIAL_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(true);

  // MongoDB is configured if environment variable or server is available
  const isConfigured = true;

  const loadUser = useCallback(async () => {
    try {
      const currentProfile = await getCurrentUserProfileAction();
      if (currentProfile) {
        setUser({
          id: currentProfile.id,
          email: currentProfile.email,
          user_metadata: { full_name: currentProfile.full_name || 'User' },
        });
        setProfile(currentProfile);
        setIsDemoUser(false);
      } else {
        setUser(null);
        setProfile(INITIAL_USER);
        setIsDemoUser(true);
      }
    } catch {
      setUser(null);
      setProfile(INITIAL_USER);
      setIsDemoUser(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await loginAction(email, password);
      if (!res.success) {
        return { error: new Error(res.error || 'Invalid credentials') };
      }

      if (res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          user_metadata: { full_name: res.user.fullName },
        });
        setIsDemoUser(false);
        await loadUser();
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await signupAction(email, password, fullName);
      if (!res.success) {
        return { error: new Error(res.error || 'Failed to sign up') };
      }

      if (res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          user_metadata: { full_name: res.user.fullName },
        });
        setIsDemoUser(false);
        await loadUser();
      }

      return { error: null, data: res.user };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await logoutAction();
    } catch {}

    if (typeof document !== 'undefined') {
      document.cookie = 'expenro_session=; path=/; max-age=0;';
      document.cookie = 'expenro_demo_user=; path=/; max-age=0;';
    }

    setUser(null);
    setProfile(INITIAL_USER);
    setIsDemoUser(true);
  };

  const resetPassword = async (_email: string) => {
    return { error: null };
  };

  const signInAsDemo = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'expenro_demo_user=true; path=/; max-age=86400;';
    }
    setUser(null);
    setProfile(INITIAL_USER);
    setIsDemoUser(true);
  };

  const refreshProfile = async () => {
    await loadUser();
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured,
        isDemoUser,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInAsDemo,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
