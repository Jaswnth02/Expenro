'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { MealEntryModel, MealSettlementModel, ExpenseModel, CategoryModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { MealEntry, MealSettlement, PaymentMethod, Expense } from '@/types';

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

export async function getMealEntriesAction(
  month?: number,
  year?: number
): Promise<ActionResponse<MealEntry[]>> {
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
      query.date = {
        $gte: `${year}-${monthStr}-01`,
        $lte: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    const docs = await MealEntryModel.find(query).sort({ date: 1, createdAt: 1 }).lean();
    const data: MealEntry[] = docs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      date: d.date,
      meal_type: d.mealType,
      name: d.name,
      amount: Number(d.amount),
      status: d.status,
      notes: d.notes,
      is_settled: d.isSettled,
      settlement_id: d.settlementId,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addMealEntryAction(
  entry: Omit<MealEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<MealEntry>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...entry,
          id: `meal-${Date.now()}`,
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

    const created: any = await MealEntryModel.create({
      userId,
      date: entry.date,
      mealType: entry.meal_type,
      name: entry.name,
      amount: entry.amount,
      status: entry.status || 'eaten',
      notes: entry.notes || null,
      isSettled: entry.is_settled ?? false,
      settlementId: entry.settlement_id || null,
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        date: created.date,
        meal_type: created.mealType,
        name: created.name,
        amount: Number(created.amount),
        status: created.status as any,
        notes: created.notes,
        is_settled: created.isSettled,
        settlement_id: created.settlementId,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateMealEntryAction(
  id: string,
  updates: Partial<MealEntry>
): Promise<ActionResponse<MealEntry>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const updatePayload: any = {};
    if (updates.date !== undefined) updatePayload.date = updates.date;
    if (updates.meal_type !== undefined) updatePayload.mealType = updates.meal_type;
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.is_settled !== undefined) updatePayload.isSettled = updates.is_settled;
    if (updates.settlement_id !== undefined) updatePayload.settlementId = updates.settlement_id;

    const updated: any = await MealEntryModel.findByIdAndUpdate(id, updatePayload, { new: true }).lean();
    if (!updated) {
      return { success: false, error: 'Meal entry not found' };
    }

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        user_id: updated.userId,
        date: updated.date,
        meal_type: updated.mealType,
        name: updated.name,
        amount: Number(updated.amount),
        status: updated.status as any,
        notes: updated.notes,
        is_settled: updated.isSettled,
        settlement_id: updated.settlementId,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteMealEntryAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await MealEntryModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getMealSettlementsAction(): Promise<ActionResponse<MealSettlement[]>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: [] };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: true, data: [] };
    }

    const docs = await MealSettlementModel.find({ userId }).sort({ createdAt: -1 }).lean();
    const data: MealSettlement[] = docs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      month: Number(d.month),
      year: Number(d.year),
      total_meals: Number(d.totalMeals),
      total_amount: Number(d.totalAmount),
      payment_method: d.paymentMethod as PaymentMethod,
      payment_date: d.paymentDate,
      expense_id: d.expenseId,
      notes: d.notes,
      created_at: new Date(d.createdAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function settleMonthlyMealsAction(params: {
  month: number;
  year: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  createExpense?: boolean;
  notes?: string;
}): Promise<ActionResponse<{ settlement: MealSettlement; expense?: Expense }>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const monthStr = String(params.month).padStart(2, '0');
    const lastDay = new Date(params.year, params.month, 0).getDate();
    const dateQuery = {
      $gte: `${params.year}-${monthStr}-01`,
      $lte: `${params.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };

    const mealDocs = await MealEntryModel.find({
      userId,
      date: dateQuery,
      status: { $ne: 'skipped' },
    }).lean();

    const totalMeals = mealDocs.length;
    const totalAmount = mealDocs.reduce((sum, m) => sum + Number(m.amount), 0);

    let createdExpenseDoc: any = null;
    if (params.createExpense && totalAmount > 0) {
      // Find or create 'Mess Food' category
      let messCategory = await CategoryModel.findOne({
        name: /Mess Food/i,
        $or: [{ userId: null }, { userId }],
      }).lean();

      if (!messCategory) {
        messCategory = await CategoryModel.create({
          userId,
          name: 'Mess Food',
          type: 'expense',
          color: '#EA580C',
          icon: 'Utensils',
        });
      }

      createdExpenseDoc = await ExpenseModel.create({
        userId,
        categoryId: messCategory._id.toString(),
        amount: totalAmount,
        description: `Mess Food Bill Settlement - ${params.month}/${params.year}`,
        paymentMethod: params.paymentMethod,
        expenseDate: params.paymentDate,
        notes: params.notes || `Settlement for ${totalMeals} meals in ${monthStr}/${params.year}`,
      });
    }

    const createdSettlement = await MealSettlementModel.create({
      userId,
      month: params.month,
      year: params.year,
      totalMeals,
      totalAmount,
      paymentMethod: params.paymentMethod,
      paymentDate: params.paymentDate,
      expenseId: createdExpenseDoc ? createdExpenseDoc._id.toString() : null,
      notes: params.notes || null,
    });

    const settlementId = createdSettlement._id.toString();

    // Mark all meals for this month as settled
    await MealEntryModel.updateMany(
      { userId, date: dateQuery },
      { isSettled: true, settlementId }
    );

    const settlement: MealSettlement = {
      id: settlementId,
      user_id: createdSettlement.userId,
      month: createdSettlement.month,
      year: createdSettlement.year,
      total_meals: createdSettlement.totalMeals,
      total_amount: createdSettlement.totalAmount,
      payment_method: createdSettlement.paymentMethod as PaymentMethod,
      payment_date: createdSettlement.paymentDate,
      expense_id: createdSettlement.expenseId,
      notes: createdSettlement.notes,
      created_at: new Date(createdSettlement.createdAt).toISOString(),
    };

    let expense: Expense | undefined = undefined;
    if (createdExpenseDoc) {
      expense = {
        id: createdExpenseDoc._id.toString(),
        user_id: createdExpenseDoc.userId,
        category_id: createdExpenseDoc.categoryId,
        amount: Number(createdExpenseDoc.amount),
        description: createdExpenseDoc.description,
        payment_method: createdExpenseDoc.paymentMethod as PaymentMethod,
        expense_date: createdExpenseDoc.expenseDate,
        notes: createdExpenseDoc.notes,
        created_at: new Date(createdExpenseDoc.createdAt).toISOString(),
        updated_at: new Date(createdExpenseDoc.updatedAt).toISOString(),
      };
    }

    return { success: true, data: { settlement, expense } };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
