'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { ExpenseModel, CategoryModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { Expense, Category } from '@/types';

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

  const firstUser = await UserModel.findOne().lean();
  if (firstUser) return firstUser._id.toString();

  return null;
}

export async function getExpensesAction(
  month?: number,
  year?: number
): Promise<ActionResponse<Expense[]>> {
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
      query.expenseDate = {
        $gte: `${year}-${monthStr}-01`,
        $lte: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    const docs = await ExpenseModel.find(query).sort({ expenseDate: -1, createdAt: -1 }).lean();

    // Fetch categories to populate
    const categoryIds = Array.from(
      new Set(docs.map((d: any) => d.categoryId).filter(Boolean))
    );
    const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
    const catMap = new Map<string, Category>();
    for (const c of categories) {
      catMap.set(c._id.toString(), {
        id: c._id.toString(),
        user_id: c.userId,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        created_at: new Date(c.createdAt).toISOString(),
      });
    }

    const data: Expense[] = docs.map((d: any) => {
      const catId = d.categoryId ? d.categoryId.toString() : null;
      return {
        id: d._id.toString(),
        user_id: d.userId,
        category_id: catId,
        category: catId ? catMap.get(catId) : undefined,
        amount: Number(d.amount),
        description: d.description,
        payment_method: (d.paymentMethod as any) || 'UPI',
        expense_date: d.expenseDate,
        notes: d.notes,
        receipt_url: d.receiptUrl,
        created_at: new Date(d.createdAt).toISOString(),
        updated_at: new Date(d.updatedAt).toISOString(),
      };
    });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function addExpenseAction(
  expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
): Promise<ActionResponse<Expense>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...expense,
          id: `exp-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const userId = await resolveUserId(expense.user_id);
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const created = await ExpenseModel.create({
      userId,
      categoryId: expense.category_id || null,
      amount: expense.amount,
      description: expense.description,
      paymentMethod: expense.payment_method || 'UPI',
      expenseDate: expense.expense_date,
      notes: expense.notes || null,
      receiptUrl: expense.receipt_url || null,
    });

    let catObj: Category | undefined = undefined;
    if (created.categoryId) {
      const catDoc = await CategoryModel.findById(created.categoryId).lean();
      if (catDoc) {
        catObj = {
          id: catDoc._id.toString(),
          user_id: catDoc.userId,
          name: catDoc.name,
          type: catDoc.type,
          color: catDoc.color,
          icon: catDoc.icon,
          created_at: new Date(catDoc.createdAt).toISOString(),
        };
      }
    }

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        category_id: created.categoryId,
        category: catObj,
        amount: Number(created.amount),
        description: created.description,
        payment_method: (created.paymentMethod as any) || 'UPI',
        expense_date: created.expenseDate,
        notes: created.notes,
        receipt_url: created.receiptUrl,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateExpenseAction(
  id: string,
  updates: Partial<Expense>
): Promise<ActionResponse<Expense>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          id,
          user_id: 'user-default-1',
          category_id: updates.category_id || null,
          amount: updates.amount || 0,
          description: updates.description || '',
          payment_method: updates.payment_method || 'UPI',
          expense_date: updates.expense_date || new Date().toISOString().split('T')[0],
          notes: updates.notes || null,
          receipt_url: updates.receipt_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const updatePayload: any = {};
    if (updates.category_id !== undefined) updatePayload.categoryId = updates.category_id;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.payment_method !== undefined) updatePayload.paymentMethod = updates.payment_method;
    if (updates.expense_date !== undefined) updatePayload.expenseDate = updates.expense_date;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.receipt_url !== undefined) updatePayload.receiptUrl = updates.receipt_url;

    const updated = await ExpenseModel.findByIdAndUpdate(id, updatePayload, { new: true }).lean();
    if (!updated) {
      return { success: false, error: 'Expense record not found' };
    }

    let catObj: Category | undefined = undefined;
    if (updated.categoryId) {
      const catDoc = await CategoryModel.findById(updated.categoryId).lean();
      if (catDoc) {
        catObj = {
          id: catDoc._id.toString(),
          user_id: catDoc.userId,
          name: catDoc.name,
          type: catDoc.type,
          color: catDoc.color,
          icon: catDoc.icon,
          created_at: new Date(catDoc.createdAt).toISOString(),
        };
      }
    }

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        user_id: updated.userId,
        category_id: updated.categoryId,
        category: catObj,
        amount: Number(updated.amount),
        description: updated.description,
        payment_method: (updated.paymentMethod as any) || 'UPI',
        expense_date: updated.expenseDate,
        notes: updated.notes,
        receipt_url: updated.receiptUrl,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await ExpenseModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
