'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { SavingsGoalModel, SavingsTransactionModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { SavingsGoal, SavingsTransaction } from '@/types';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function resolveUserId(): Promise<string | null> {
  const session = await getSessionUser();
  if (session?.userId) return session.userId;
  const firstUser = await UserModel.findOne().lean();
  if (firstUser) return firstUser._id.toString();
  return null;
}

export async function getSavingsGoalsAction(): Promise<ActionResponse<SavingsGoal[]>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: [] };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: true, data: [] };
    }

    const goals = await SavingsGoalModel.find({ userId }).sort({ createdAt: -1 }).lean();
    const transactions = await SavingsTransactionModel.find({ userId }).lean();

    const savedAmountMap = new Map<string, number>();
    for (const tx of transactions) {
      const gId = tx.goalId.toString();
      savedAmountMap.set(gId, (savedAmountMap.get(gId) || 0) + Number(tx.amount));
    }

    const data: SavingsGoal[] = goals.map((g: any) => {
      const id = g._id.toString();
      const targetAmount = Number(g.targetAmount);
      const savedAmount = savedAmountMap.get(id) || 0;
      const progressPercentage = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;

      return {
        id,
        user_id: g.userId,
        name: g.name,
        target_amount: targetAmount,
        target_date: g.targetDate,
        description: g.description,
        saved_amount: savedAmount,
        progress_percentage: progressPercentage,
        created_at: new Date(g.createdAt).toISOString(),
        updated_at: new Date(g.updatedAt).toISOString(),
      };
    });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addSavingsGoalAction(
  goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at' | 'saved_amount' | 'progress_percentage'>
): Promise<ActionResponse<SavingsGoal>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...goal,
          id: `goal-${Date.now()}`,
          saved_amount: 0,
          progress_percentage: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const created = await SavingsGoalModel.create({
      userId,
      name: goal.name,
      targetAmount: goal.target_amount,
      targetDate: goal.target_date || null,
      description: goal.description || null,
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        name: created.name,
        target_amount: Number(created.targetAmount),
        target_date: created.targetDate,
        description: created.description,
        saved_amount: 0,
        progress_percentage: 0,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateSavingsGoalAction(
  id: string,
  updates: Partial<SavingsGoal>
): Promise<ActionResponse<SavingsGoal>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          id,
          user_id: 'user-default-1',
          name: updates.name || 'Goal',
          target_amount: updates.target_amount || 0,
          target_date: updates.target_date || null,
          description: updates.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const updatePayload: any = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.target_amount !== undefined) updatePayload.targetAmount = updates.target_amount;
    if (updates.target_date !== undefined) updatePayload.targetDate = updates.target_date;
    if (updates.description !== undefined) updatePayload.description = updates.description;

    const updated = await SavingsGoalModel.findByIdAndUpdate(id, updatePayload, { new: true }).lean();
    if (!updated) {
      return { success: false, error: 'Savings goal not found' };
    }

    const txs = await SavingsTransactionModel.find({ goalId: id }).lean();
    const savedAmount = txs.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const targetAmount = Number(updated.targetAmount);

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        user_id: updated.userId,
        name: updated.name,
        target_amount: targetAmount,
        target_date: updated.targetDate,
        description: updated.description,
        saved_amount: savedAmount,
        progress_percentage: targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteSavingsGoalAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await Promise.all([
      SavingsGoalModel.findByIdAndDelete(id),
      SavingsTransactionModel.deleteMany({ goalId: id }),
    ]);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addSavingsTransactionAction(
  transaction: Omit<SavingsTransaction, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<SavingsTransaction>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...transaction,
          id: `tx-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const created = await SavingsTransactionModel.create({
      userId,
      goalId: transaction.goal_id,
      amount: transaction.amount,
      transactionDate: transaction.transaction_date,
      note: transaction.note || null,
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        goal_id: created.goalId,
        amount: Number(created.amount),
        transaction_date: created.transactionDate,
        note: created.note,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteSavingsTransactionAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await SavingsTransactionModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

