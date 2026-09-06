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

async function getClients() {
  const admin = getAdminClient();
  let server: any = null;
  let user: any = null;

  try {
    server = await createServerClient();
    const userRes = await server.auth.getUser();
    user = userRes.data?.user || null;
  } catch {
    // If running in a context without request cookies (or during background/script execution), ignore
  }

  const client = admin || server;
  return { admin, server, client, user };
}

export async function addIncomeAction(
  income: Omit<Income, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<Income>> {
  try {
    const { admin, client, user } = await getClients();
    if (!client) return { success: false, error: 'Database client not available' };

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

    const { data, error } = await client.from('income').insert(payload).select().single();
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
    const { client } = await getClients();
    if (!client) return { success: false, error: 'Database client not available' };

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

export async function updateIncomeAction(
  id: string,
  updates: Partial<Income>
): Promise<ActionResponse<Income>> {
  try {
    const { client } = await getClients();
    if (!client) return { success: false, error: 'Database client not available' };

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.amount !== undefined) payload.amount = Number(updates.amount);
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.income_date !== undefined) payload.income_date = updates.income_date;
    if (updates.notes !== undefined) payload.notes = updates.notes || null;

    const { data, error } = await client
      .from('income')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

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

export async function deleteIncomeAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const { client } = await getClients();
    if (!client) return { success: false, error: 'Database client not available' };
    const { error } = await client.from('income').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function calibrateWalletBalanceAction(
  targetBalance: number
): Promise<ActionResponse<Income>> {
  try {
    const { admin, client, user } = await getClients();
    if (!client) return { success: false, error: 'Database client not available' };

    // Query expenses, savings_transactions, and income in parallel
    const [expensesRes, savingsRes, incomesRes] = await Promise.all([
      client.from('expenses').select('amount, expense_date'),
      client.from('savings_transactions').select('amount'),
      client.from('income').select('*').order('income_date', { ascending: false }),
    ]);

    if (expensesRes.error) return { success: false, error: expensesRes.error.message };
    if (savingsRes.error) return { success: false, error: savingsRes.error.message };
    if (incomesRes.error) return { success: false, error: incomesRes.error.message };

    const expenses = expensesRes.data || [];
    const savings = savingsRes.data || [];
    const incomes = incomesRes.data || [];

    const totalExp = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalSav = savings.reduce((s: number, st: any) => s + Number(st.amount || 0), 0);

    const openingIncomes = incomes.filter(
      (i: any) =>
        i.source?.toLowerCase() === 'opening balance' ||
        i.description?.toLowerCase() === 'opening balance'
    );
    const existingOpening = openingIncomes[0];

    const otherIncomes = incomes
      .filter((i: any) => !openingIncomes.some((op: any) => op.id === i.id))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // Postgres CHECK constraint: amount > 0
    const rawRequired = Number((targetBalance + totalExp + totalSav - otherIncomes).toFixed(2));
    const requiredOpening = Math.max(0.01, rawRequired);

    let targetUserId = user?.id || existingOpening?.user_id;
    if (!targetUserId && admin) {
      const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (userList?.users?.[0]?.id) {
        targetUserId = userList.users[0].id;
      }
    }

    const notes = `Calibrated to set current available balance to ₹${targetBalance.toLocaleString('en-IN')}`;

    if (existingOpening) {
      const { data, error } = await client
        .from('income')
        .update({
          amount: requiredOpening,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOpening.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          ...data,
          amount: Number(data.amount),
        } as Income,
      };
    } else {
      const sortedExp = [...expenses].sort(
        (a: any, b: any) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
      );
      const startDate = sortedExp[0]?.expense_date || new Date().toISOString().split('T')[0];

      const { data, error } = await client
        .from('income')
        .insert({
          user_id: targetUserId,
          source: 'Opening Balance',
          amount: requiredOpening,
          description: 'Starting wallet balance calibration',
          income_date: startDate,
          notes,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          ...data,
          amount: Number(data.amount),
        } as Income,
      };
    }
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}


