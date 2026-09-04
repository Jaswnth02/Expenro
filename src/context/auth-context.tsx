'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types';
import { INITIAL_USER } from '@/lib/data-service';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(INITIAL_USER);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(true);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isConfigured = Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project-id')
  );

  const supabase = useMemo(() => createClient(), []);

  // Fetch or create profile for authenticated user
  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || currentUser.user_metadata?.full_name || 'User',
          email: data.email || currentUser.email || '',
          currency: (data.currency as any) || 'INR',
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } else if (error && error.code === 'PGRST116') {
        // Profile does not exist yet; insert profile
        const newProfile: UserProfile = {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          currency: 'INR',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);
        setProfile(newProfile);
      }
    } catch {
      // Fallback to metadata
      setProfile({
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        email: currentUser.email || '',
        currency: 'INR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      // Demo Mode
      setUser(null);
      setSession(null);
      setProfile(INITIAL_USER);
      setIsDemoUser(true);
      setIsLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        setIsDemoUser(false);
        fetchProfile(currentSession.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser(currentSession.user);
        setIsDemoUser(false);
        await fetchProfile(currentSession.user);
      } else {
        setUser(null);
        setProfile(INITIAL_USER);
        setIsDemoUser(true);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, supabase]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      // Demo sign in
      signInAsDemo();
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsDemoUser(false);
        await fetchProfile(data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isConfigured) {
      signInAsDemo();
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return { error };

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsDemoUser(false);
        await fetchProfile(data.user);
      }

      return { error: null, data };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'expenro_demo_user=; path=/; max-age=0;';
    }
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(INITIAL_USER);
    setIsDemoUser(true);
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/settings`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInAsDemo = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'expenro_demo_user=true; path=/; max-age=86400;';
    }
    setUser(null);
    setSession(null);
    setProfile(INITIAL_USER);
    setIsDemoUser(true);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

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
