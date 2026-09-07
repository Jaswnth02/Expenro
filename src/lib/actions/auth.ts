'use server';

import bcrypt from 'bcryptjs';
import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { UserModel, CategoryModel } from '@/lib/mongodb/models';
import {
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
} from '@/lib/auth/session';
import { DEFAULT_CATEGORIES, INITIAL_USER } from '@/lib/data-service';
import { UserProfile } from '@/types';

interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
    fullName?: string;
  };
}

/**
 * Seed default categories for a newly registered user
 */
async function seedUserCategories(userId: string) {
  try {
    const existing = await CategoryModel.countDocuments({ userId });
    if (existing === 0) {
      const docs = DEFAULT_CATEGORIES.map((cat) => ({
        userId,
        name: cat.name,
        type: cat.type,
        color: cat.color || '#10B981',
        icon: cat.icon || 'tag',
      }));
      await CategoryModel.insertMany(docs);
    }
  } catch (err) {
    console.error('Failed to seed default categories for user:', err);
  }
}

/**
 * Sign in a user with email and password using MongoDB.
 */
export async function loginAction(
  emailInput: string,
  passwordInput: string
): Promise<AuthResponse> {
  try {
    let email = (emailInput || '').trim().toLowerCase();
    const password = passwordInput || '';

    // Auto-normalize common typo in registered email
    if (email === 'jaswanthm2006@gmail.com') {
      email = 'jaswanthmg2006@gmail.com';
    }

    if (!email || !password) {
      return { success: false, error: 'Please provide both email and password.' };
    }

    if (!isMongoConfigured()) {
      return {
        success: false,
        error: 'MongoDB is not configured. Please set MONGODB_URI in your environment or use Demo Mode.',
      };
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return {
        success: false,
        error: 'Unable to connect to MongoDB. Please check if your MongoDB server or Atlas cluster is running.',
      };
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const token = await signSessionToken({
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
    });

    await setSessionCookie(token);

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Sign up a new user with email, password, and full name.
 */
export async function signupAction(
  emailInput: string,
  passwordInput: string,
  fullNameInput: string
): Promise<AuthResponse> {
  try {
    const email = (emailInput || '').trim().toLowerCase();
    const password = passwordInput || '';
    const fullName = (fullNameInput || '').trim() || 'User';

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (!isMongoConfigured()) {
      return {
        success: false,
        error: 'MongoDB is not configured. Please set MONGODB_URI in your environment.',
      };
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return {
        success: false,
        error: 'Unable to connect to MongoDB server. Please check your connection.',
      };
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      email,
      passwordHash,
      fullName,
      currency: 'INR',
      regular_expenses_enabled: true,
      low_balance_threshold: 1000,
    });

    const userId = newUser._id.toString();

    // Provision default categories
    await seedUserCategories(userId);

    const token = await signSessionToken({
      userId,
      email: newUser.email,
      fullName: newUser.fullName,
    });

    await setSessionCookie(token);

    return {
      success: true,
      user: {
        id: userId,
        email: newUser.email,
        fullName: newUser.fullName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Log out user by clearing session cookie.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    await clearSessionCookie();
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Get current session user profile from MongoDB.
 */
export async function getCurrentUserProfileAction(): Promise<UserProfile | null> {
  try {
    const session = await getSessionUser();
    if (!session || !session.userId) {
      return null;
    }

    if (!isMongoConfigured()) {
      return {
        ...INITIAL_USER,
        id: session.userId,
        email: session.email,
      };
    }

    await connectToDatabase();
    const user = await UserModel.findById(session.userId).lean();
    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      full_name: user.fullName || 'User',
      currency: (user.currency as any) || 'INR',
      regular_expenses_enabled: user.regular_expenses_enabled ?? true,
      low_balance_threshold: user.low_balance_threshold ?? 1000,
      created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      updated_at: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to get current user profile:', err);
    return null;
  }
}

/**
 * Update user settings in MongoDB
 */
export async function updateUserProfileAction(
  updates: Partial<Pick<UserProfile, 'full_name' | 'currency' | 'regular_expenses_enabled' | 'low_balance_threshold'>>
): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const session = await getSessionUser();
    if (!session || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectToDatabase();
    const updated = await UserModel.findByIdAndUpdate(
      session.userId,
      {
        ...(updates.full_name !== undefined && { fullName: updates.full_name }),
        ...(updates.currency !== undefined && { currency: updates.currency }),
        ...(updates.regular_expenses_enabled !== undefined && {
          regular_expenses_enabled: updates.regular_expenses_enabled,
        }),
        ...(updates.low_balance_threshold !== undefined && {
          low_balance_threshold: updates.low_balance_threshold,
        }),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        email: updated.email,
        full_name: updated.fullName,
        currency: (updated.currency as any) || 'INR',
        regular_expenses_enabled: updated.regular_expenses_enabled ?? true,
        low_balance_threshold: updated.low_balance_threshold ?? 1000,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
