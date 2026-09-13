'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { IncomeModel, ExpenseModel } from '@/lib/mongodb/models';
import { getEffectiveUserId } from '@/lib/auth/session';
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
    const userId = await getEffectiveUserId(income.user_id);
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
    const userId = await getEffectiveUserId();
    if (!userId) {
      return { success: true, data: [] };
    }

    const query: any = { userId };
    if (month !== undefined && year !== undefined && month > 0) {
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
 * Calibrate wallet balance by updating or creating an Opening Balance record in MongoDB
 * so all-time available balance matches targetBalance accurately.
 */
export async function calibrateWalletBalanceAction(
  targetBalance: number,
  _month?: number,
  _year?: number
): Promise<ActionResponse<Income>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await getEffectiveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const { SavingsTransactionModel } = await import('@/lib/mongodb/models');

    // Fetch all records for the user to compute lifetime balance accurately
    const [incomes, expenses, savingsTransactions] = await Promise.all([
      IncomeModel.find({ userId }).lean(),
      ExpenseModel.find({ userId }).lean(),
      SavingsTransactionModel.find({ userId }).lean(),
    ]);

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const totalSavings = savingsTransactions.reduce(
      (sum, tx: any) => sum + Number(tx.amount || 0),
      0
    );

    // Identify opening balance or existing calibration record
    const calibrationDoc = incomes.find(
      (i: any) =>
        i.source?.toLowerCase() === 'opening balance' ||
        i.description?.toLowerCase() === 'wallet balance calibration' ||
        i.description?.toLowerCase() === 'starting wallet balance calibration'
    );

    const otherIncomesTotal = incomes
      .filter((i: any) => !calibrationDoc || i._id.toString() !== calibrationDoc._id.toString())
      .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

    // Target lifetime equation:
    // requiredOpening + otherIncomesTotal - totalExpenses - totalSavings = targetBalance
    // => requiredOpening = targetBalance + totalExpenses + totalSavings - otherIncomesTotal
    const requiredOpening = Number(
      (targetBalance + totalExpenses + totalSavings - otherIncomesTotal).toFixed(2)
    );

    let resultDoc: any;
    if (calibrationDoc) {
      resultDoc = await IncomeModel.findByIdAndUpdate(
        calibrationDoc._id,
        {
          amount: requiredOpening,
          notes: `Calibrated wallet balance to ₹${targetBalance.toLocaleString()}`,
          updatedAt: new Date(),
        },
        { new: true }
      ).lean();
    } else {
      resultDoc = await IncomeModel.create({
        userId,
        source: 'Opening Balance',
        amount: requiredOpening,
        description: 'Starting wallet balance calibration',
        incomeDate: '2026-06-01',
        notes: `Calibrated wallet balance to ₹${targetBalance.toLocaleString()}`,
      });
    }

    return {
      success: true,
      data: {
        id: resultDoc._id.toString(),
        user_id: resultDoc.userId,
        source: resultDoc.source,
        amount: Number(resultDoc.amount),
        description: resultDoc.description,
        income_date: resultDoc.incomeDate,
        notes: resultDoc.notes,
        created_at: new Date(resultDoc.createdAt).toISOString(),
        updated_at: new Date(resultDoc.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
