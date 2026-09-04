'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Income } from '@/types';

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

export async function addIncomeAction(
  income: Omit<Income, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<Income>> {
  try {
    const admin = getAdminClient();
    const server = await createServerClient();
    const {
      data: { user },
    } = await server.auth.getUser();

    const isUUID = (str?: string | null) =>
      str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

    let targetUserId = user?.id;
    if (!targetUserId && isUUID(income.user_id)) {
      targetUserId = income.user_id;
    }

    if (!targetUserId && admin) {
      const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (userList?.users?.[0]?.id) {
        targetUserId = userList.users[0].id;
      }
    }

    const payload = {
      user_id: targetUserId,
      source: income.source,
      amount: Number(income.amount),
      description: income.description || null,
      income_date: income.income_date,
      notes: income.notes || null,
    };

    if (admin) {
      const { data, error } = await admin.from('income').insert(payload).select().single();
      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          ...data,
          amount: Number(data.amount),
        } as Income,
      };
    }

    const { data, error } = await server.from('income').insert(payload).select().single();
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: {
        ...data,
        amount: Number(data.amount),
      } as Income,
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getIncomesAction(
  month?: number,
  year?: number
): Promise<ActionResponse<Income[]>> {
  try {
    const admin = getAdminClient();
    const client = admin || (await createServerClient());

    let query = client
      .from('income')
      .select('*')
      .order('income_date', { ascending: false });

    if (month !== undefined && year !== undefined) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('income_date', startDate).lte('income_date', endDate);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const formatted = (data || []).map((i: any) => ({
      ...i,
      amount: Number(i.amount),
    })) as Income[];

    return { success: true, data: formatted };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteIncomeAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const admin = getAdminClient();
    const client = admin || (await createServerClient());
    const { error } = await client.from('income').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
