'use server';

import { createClient } from '@/lib/supabase/server';
import { regularExpenseSchema } from '@/lib/validations/regular-expense';
import { RegularExpense, PaymentMethod } from '@/types';
import { getEligibleRegularExpenses as filterEligible } from '@/lib/calculations/regular-expenses';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Derives the authenticated user strictly from the Supabase session on the server.
 */
async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }
  return { supabase, user };
}

/**
 * Fetch all regular expenses for the authenticated user.
 */
export async function getRegularExpenses(): Promise<ActionResponse<RegularExpense[]>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const { data, error } = await supabase
      .from('regular_expenses')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data || []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as RegularExpense),
        amount: Number(r.amount),
        category: (r.category as RegularExpense['category']) || undefined,
      })),
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to fetch regular expenses' };
  }
}

/**
 * Create a new regular expense for the authenticated user.
 */
export async function createRegularExpense(rawInput: unknown): Promise<ActionResponse<RegularExpense>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const validated = regularExpenseSchema.safeParse(rawInput);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Invalid regular expense input';
      return { success: false, error: firstError };
    }

    const data = validated.data;

    const { data: created, error } = await supabase
      .from('regular_expenses')
      .insert({
        user_id: user.id,
        name: data.name,
        amount: data.amount,
        category_id: data.category_id || null,
        icon: data.icon || 'Tag',
        frequency: data.frequency,
        interval_days: data.interval_days || null,
        weekly_day: data.weekly_day !== undefined ? data.weekly_day : null,
        monthly_day: data.monthly_day || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        display_time: data.display_time || null,
        active: data.active,
        display_order: data.display_order,
      })
      .select('*, category:categories(*)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        ...created,
        amount: Number(created.amount),
        category: created.category || undefined,
      } as RegularExpense,
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to create regular expense' };
  }
}

/**
 * Update an existing regular expense. Verifies ownership.
 */
export async function updateRegularExpense(
  id: string,
  rawUpdates: unknown
): Promise<ActionResponse<RegularExpense>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const validated = regularExpenseSchema.partial().safeParse(rawUpdates);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Invalid regular expense update';
      return { success: false, error: firstError };
    }

    const updates = validated.data;
    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('regular_expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user strict ownership
      .select('*, category:categories(*)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        ...updated,
        amount: Number(updated.amount),
        category: updated.category || undefined,
      } as RegularExpense,
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to update regular expense' };
  }
}

/**
 * Toggle the active state of a regular expense.
 */
export async function toggleRegularExpense(
  id: string,
  active?: boolean
): Promise<ActionResponse<RegularExpense>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    let targetActive = active;
    if (targetActive === undefined) {
      const { data: current } = await supabase
        .from('regular_expenses')
        .select('active')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      targetActive = !current?.active;
    }

    const { data: updated, error } = await supabase
      .from('regular_expenses')
      .update({ active: targetActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, category:categories(*)')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        ...updated,
        amount: Number(updated.amount),
        category: updated.category || undefined,
      } as RegularExpense,
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to toggle regular expense' };
  }
}

/**
 * Delete a regular expense. Never deletes past transactions in `expenses`.
 */
export async function deleteRegularExpense(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const { error } = await supabase
      .from('regular_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to delete regular expense' };
  }
}

/**
 * Get eligible regular expenses for a target date.
 */
export async function getEligibleRegularExpenses(
  targetDate: string,
  options?: { checkTime?: boolean; currentTime?: string }
): Promise<ActionResponse<RegularExpense[]>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    // Check user preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('regular_expenses_enabled')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.regular_expenses_enabled === false) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('regular_expenses')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    const formatted: RegularExpense[] = (data || []).map((r: Record<string, unknown>) => ({
      ...(r as unknown as RegularExpense),
      amount: Number(r.amount),
      category: (r.category as RegularExpense['category']) || undefined,
    }));

    const eligible = filterEligible(formatted, targetDate, options);
    return { success: true, data: eligible };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to get eligible regular expenses' };
  }
}

/**
 * Add selected regular expenses as real rows in the `expenses` table.
 */
export async function addSelectedRegularExpenses(
  items: { regularExpenseId: string; amount: number; description?: string }[],
  paymentMethod: PaymentMethod,
  expenseDate: string
): Promise<ActionResponse<number>> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    if (!items || items.length === 0) {
      return { success: false, error: 'No items selected.' };
    }

    const ids = items.map((i) => i.regularExpenseId);
    const { data: regularExpenses, error: fetchErr } = await supabase
      .from('regular_expenses')
      .select('*')
      .in('id', ids)
      .eq('user_id', user.id);

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    const regMap = new Map((regularExpenses || []).map((r) => [r.id, r]));

    const expenseInserts: {
      user_id: string;
      category_id: string | null;
      amount: number;
      description: string;
      payment_method: PaymentMethod;
      expense_date: string;
      notes: null;
      receipt_url: null;
    }[] = [];

    for (const item of items) {
      const reg = regMap.get(item.regularExpenseId);
      if (!reg) continue;

      expenseInserts.push({
        user_id: user.id,
        category_id: reg.category_id || null,
        amount: item.amount > 0 ? item.amount : Number(reg.amount),
        description: item.description?.trim() || reg.name,
        payment_method: paymentMethod,
        expense_date: expenseDate,
        notes: null,
        receipt_url: null,
      });
    }

    if (expenseInserts.length === 0) {
      return { success: false, error: 'None of the selected items were found.' };
    }

    const { error: insertErr } = await supabase.from('expenses').insert(expenseInserts);
    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true, data: expenseInserts.length };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to add selected regular expenses' };
  }
}
