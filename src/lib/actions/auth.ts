'use server';

import { createClient } from '@/lib/supabase/server';

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Server action to sign in a user with email and password.
 * Automatically normalizes email typos (e.g. jaswanthm2006 -> jaswanthmg2006)
 * and sets auth cookies directly in server response headers.
 */
export async function loginAction(
  emailInput: string,
  passwordInput: string
): Promise<AuthResponse> {
  try {
    let email = (emailInput || '').trim();
    const password = passwordInput || '';

    // Auto-normalize common typo in the registered email
    if (email.toLowerCase() === 'jaswanthm2006@gmail.com') {
      email = 'jaswanthmg2006@gmail.com';
    }

    if (!email || !password) {
      return { success: false, error: 'Please provide both email and password.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'User could not be authenticated.' };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
