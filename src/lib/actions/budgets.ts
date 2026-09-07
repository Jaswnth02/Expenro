'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { BudgetModel, CategoryModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { Budget, Category } from '@/types';

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

export async function getBudgetsAction(
  month?: number,
  year?: number
): Promise<ActionResponse<Budget[]>> {
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
    if (month !== undefined) query.month = month;
    if (year !== undefined) query.year = year;

    const docs = await BudgetModel.find(query).lean();
    const categoryIds = docs.map((d: any) => d.categoryId);
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

    const data: Budget[] = docs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      category_id: d.categoryId,
      category: catMap.get(d.categoryId),
      amount: Number(d.amount),
      month: Number(d.month),
      year: Number(d.year),
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function setBudgetAction(
  categoryId: string,
  amount: number,
  month: number,
  year: number
): Promise<ActionResponse<Budget>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          id: `bgt-${Date.now()}`,
          user_id: 'user-default-1',
          category_id: categoryId,
          amount,
          month,
          year,
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

    const filter = { userId, categoryId, month, year };
    const update = { amount };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const doc = await BudgetModel.findOneAndUpdate(filter, update, options).lean();
    if (!doc) {
      return { success: false, error: 'Failed to save budget' };
    }

    let catObj: Category | undefined = undefined;
    const catDoc = await CategoryModel.findById(categoryId).lean();
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

    return {
      success: true,
      data: {
        id: doc._id.toString(),
        user_id: doc.userId,
        category_id: doc.categoryId,
        category: catObj,
        amount: Number(doc.amount),
        month: Number(doc.month),
        year: Number(doc.year),
        created_at: new Date(doc.createdAt).toISOString(),
        updated_at: new Date(doc.updatedAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function deleteBudgetAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await BudgetModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
