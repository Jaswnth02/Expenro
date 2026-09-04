'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Category } from '@/types';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key);
}

/**
 * Delete a category by ID with server privileges, ensuring even default categories can be deleted.
 */
export async function deleteCategoryAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const admin = getAdminClient();
    if (admin) {
      const { error } = await admin.from('categories').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: true };
    }

    const server = await createServerClient();
    const { error } = await server.from('categories').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Update an existing category by ID.
 */
export async function updateCategoryAction(
  id: string,
  updates: Partial<Category>
): Promise<ActionResponse<Category>> {
  try {
    const admin = getAdminClient();
    const payload = {
      name: updates.name,
      type: updates.type,
      color: updates.color,
      icon: updates.icon,
    };

    if (admin) {
      const { data, error } = await admin
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data as Category };
    }

    const server = await createServerClient();
    const { data, error } = await server
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as Category };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Create a new category.
 */
export async function createCategoryAction(
  category: Omit<Category, 'id' | 'created_at'>
): Promise<ActionResponse<Category>> {
  try {
    const server = await createServerClient();
    const {
      data: { user },
    } = await server.auth.getUser();

    const admin = getAdminClient();
    const payload = {
      user_id: user?.id || null,
      name: category.name,
      type: category.type,
      color: category.color || '#10B981',
      icon: category.icon || 'Tag',
    };

    if (admin) {
      const { data, error } = await admin
        .from('categories')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data as Category };
    }

    const { data, error } = await server
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as Category };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
