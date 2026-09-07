'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { IncomeModel, ExpenseModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
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

async function resolveUserId(explicitUserId?: string): Promise<string | null> {
  const session = await getSessionUser();
  if (session?.userId) return session.userId;
  if (explicitUserId && explicitUserId.length > 5) return explicitUserId;

  // Fallback to first user in database if any
  const firstUser = await UserModel.findOne().lean();
  if (firstUser) return firstUser._id.toString();

  return null;
}

export async function addIncomeAction(
  income: Omit<Income, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<Income>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...income,
          id: `inc-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const userId = await resolveUserId(income.user_id);
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const created = await IncomeModel.create({
      userId,
      source: income.source,
      amount: income.amount,
      description: income.description || null,
      incomeDate: income.income_date,
      notes: income.notes || null,
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        source: created.source,
        amount: created.amount,
        description: created.description,
        income_date: created.incomeDate,
        notes: created.notes,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
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
    if (!isMongoConfigured()) {
      return { success: true, data: [] };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: true, data: [] };
    }

    const query: any = { userId };
    if (month !== undefined && year !== undefined) {
      const monthStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      query.incomeDate = {
        $gte: `${year}-${monthStr}-01`,
        $lte: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    const docs = await IncomeModel.find(query).sort({ incomeDate: -1 }).lean();
    const data: Income[] = docs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      source: d.source,
      amount: Number(d.amount),
      description: d.description,
      income_date: d.incomeDate,
      notes: d.notes,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateIncomeAction(
  id: string,
  updates: Partial<Income>
): Promise<ActionResponse<Income>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          id,
          user_id: 'user-default-1',
          source: updates.source || 'Other',
          amount: updates.amount || 0,
          description: updates.description || null,
          income_date: updates.income_date || new Date().toISOString().split('T')[0],
          notes: updates.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const updated = await IncomeModel.findByIdAndUpdate(
      id,
      {
        ...(updates.source && { source: updates.source }),
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.income_date && { incomeDate: updates.income_date }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return { success: false, error: 'Income record not found' };
    }

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        user_id: updated.userId,
        source: updated.source,
        amount: Number(updated.amount),
        description: updated.description,
        income_date: updated.incomeDate,
        notes: updated.notes,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteIncomeAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await IncomeModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Calibrate wallet balance by calculating target difference and inserting an income adjustment
 */
export async function calibrateWalletBalanceAction(
  targetBalance: number,
  month: number,
  year: number
): Promise<ActionResponse<Income>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const monthStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dateQuery = {
      $gte: `${year}-${monthStr}-01`,
      $lte: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };

    const [incomes, expenses] = await Promise.all([
      IncomeModel.find({ userId, incomeDate: dateQuery }).lean(),
      ExpenseModel.find({ userId, expenseDate: dateQuery }).lean(),
    ]);

    const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const currentRemaining = totalIncome - totalExpenses;

    const adjustmentAmount = targetBalance - currentRemaining;
    if (adjustmentAmount === 0) {
      return {
        success: true,
        data: {
          id: 'noop',
          user_id: userId,
          source: 'Wallet Calibration',
          amount: 0,
          description: 'Balance already matches target',
          income_date: `${year}-${monthStr}-01`,
          notes: 'No adjustment needed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    const created = await IncomeModel.create({
      userId,
      source: 'Other',
      amount: adjustmentAmount,
      description: 'Wallet Balance Calibration',
      incomeDate: `${year}-${monthStr}-01`,
      notes: `Adjusted balance from ${currentRemaining} to ${targetBalance}`,
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        source: created.source,
        amount: created.amount,
        description: created.description,
        income_date: created.incomeDate,
        notes: created.notes,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
