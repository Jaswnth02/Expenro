'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { RegularExpenseModel, ExpenseModel, CategoryModel, UserModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { regularExpenseSchema } from '@/lib/validations/regular-expense';
import { RegularExpense, PaymentMethod, Category } from '@/types';
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

async function resolveUserId(): Promise<string | null> {
  const session = await getSessionUser();
  if (session?.userId) return session.userId;
  const firstUser = await UserModel.findOne().lean();
  if (firstUser) return firstUser._id.toString();
  return null;
}

/**
 * Fetch all regular expenses for the authenticated user.
 */
export async function getRegularExpenses(): Promise<ActionResponse<RegularExpense[]>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: [] };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const docs = await RegularExpenseModel.find({ userId })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const categoryIds = docs.map((d: any) => d.categoryId).filter(Boolean);
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

    const data: RegularExpense[] = docs.map((r: any) => ({
      id: r._id.toString(),
      user_id: r.userId,
      name: r.name,
      amount: Number(r.amount),
      category_id: r.categoryId,
      category: r.categoryId ? catMap.get(r.categoryId) : undefined,
      icon: r.icon,
      frequency: r.frequency,
      interval_days: r.intervalDays,
      weekly_day: r.weeklyDay,
      monthly_day: r.monthlyDay,
      start_date: r.startDate,
      end_date: r.endDate,
      display_time: r.displayTime,
      active: r.active,
      display_order: r.displayOrder,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    }));

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to fetch regular expenses' };
  }
}

/**
 * Create a new regular expense for the authenticated user.
 */
export async function createRegularExpense(rawInput: unknown): Promise<ActionResponse<RegularExpense>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const validated = regularExpenseSchema.safeParse(rawInput);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Invalid regular expense input';
      return { success: false, error: firstError };
    }

    const data = validated.data;

    const created = await RegularExpenseModel.create({
      userId,
      name: data.name,
      amount: data.amount,
      categoryId: data.category_id || null,
      icon: data.icon || 'Tag',
      frequency: data.frequency,
      intervalDays: data.interval_days || null,
      weeklyDay: data.weekly_day !== undefined ? data.weekly_day : null,
      monthlyDay: data.monthly_day || null,
      startDate: data.start_date,
      endDate: data.end_date || null,
      displayTime: data.display_time || null,
      active: data.active,
      displayOrder: data.display_order,
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
        name: created.name,
        amount: Number(created.amount),
        category_id: created.categoryId,
        category: catObj,
        icon: created.icon,
        frequency: created.frequency,
        interval_days: created.intervalDays,
        weekly_day: created.weeklyDay,
        monthly_day: created.monthlyDay,
        start_date: created.startDate,
        end_date: created.endDate,
        display_time: created.displayTime,
        active: created.active,
        display_order: created.displayOrder,
        created_at: new Date(created.createdAt).toISOString(),
        updated_at: new Date(created.updatedAt).toISOString(),
      },
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
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const validated = regularExpenseSchema.partial().safeParse(rawUpdates);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || 'Invalid regular expense update';
      return { success: false, error: firstError };
    }

    const updates = validated.data;
    const updatePayload: any = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.category_id !== undefined) updatePayload.categoryId = updates.category_id;
    if (updates.icon !== undefined) updatePayload.icon = updates.icon;
    if (updates.frequency !== undefined) updatePayload.frequency = updates.frequency;
    if (updates.interval_days !== undefined) updatePayload.intervalDays = updates.interval_days;
    if (updates.weekly_day !== undefined) updatePayload.weeklyDay = updates.weekly_day;
    if (updates.monthly_day !== undefined) updatePayload.monthlyDay = updates.monthly_day;
    if (updates.start_date !== undefined) updatePayload.startDate = updates.start_date;
    if (updates.end_date !== undefined) updatePayload.endDate = updates.end_date;
    if (updates.display_time !== undefined) updatePayload.displayTime = updates.display_time;
    if (updates.active !== undefined) updatePayload.active = updates.active;
    if (updates.display_order !== undefined) updatePayload.displayOrder = updates.display_order;

    const updated = await RegularExpenseModel.findOneAndUpdate(
      { _id: id, userId },
      updatePayload,
      { new: true }
    ).lean();

    if (!updated) {
      return { success: false, error: 'Regular expense not found' };
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
        name: updated.name,
        amount: Number(updated.amount),
        category_id: updated.categoryId,
        category: catObj,
        icon: updated.icon,
        frequency: updated.frequency,
        interval_days: updated.intervalDays,
        weekly_day: updated.weeklyDay,
        monthly_day: updated.monthlyDay,
        start_date: updated.startDate,
        end_date: updated.endDate,
        display_time: updated.displayTime,
        active: updated.active,
        display_order: updated.displayOrder,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      },
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
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const current = await RegularExpenseModel.findOne({ _id: id, userId }).lean();
    if (!current) {
      return { success: false, error: 'Regular expense not found' };
    }

    const targetActive = active !== undefined ? active : !current.active;
    const updated = await RegularExpenseModel.findOneAndUpdate(
      { _id: id, userId },
      { active: targetActive },
      { new: true }
    ).lean();

    return {
      success: true,
      data: {
        id: updated!._id.toString(),
        user_id: updated!.userId,
        name: updated!.name,
        amount: Number(updated!.amount),
        category_id: updated!.categoryId,
        icon: updated!.icon,
        frequency: updated!.frequency,
        interval_days: updated!.intervalDays,
        weekly_day: updated!.weeklyDay,
        monthly_day: updated!.monthlyDay,
        start_date: updated!.startDate,
        end_date: updated!.endDate,
        display_time: updated!.displayTime,
        active: updated!.active,
        display_order: updated!.displayOrder,
        created_at: new Date(updated!.createdAt).toISOString(),
        updated_at: new Date(updated!.updatedAt).toISOString(),
      },
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
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    await RegularExpenseModel.findOneAndDelete({ _id: id, userId });
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
    if (!isMongoConfigured()) {
      return { success: true, data: [] };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const user = await UserModel.findById(userId).lean();
    if (user && user.regular_expenses_enabled === false) {
      return { success: true, data: [] };
    }

    const docs = await RegularExpenseModel.find({ userId, active: true }).lean();
    const categoryIds = docs.map((d: any) => d.categoryId).filter(Boolean);
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

    const formatted: RegularExpense[] = docs.map((r: any) => ({
      id: r._id.toString(),
      user_id: r.userId,
      name: r.name,
      amount: Number(r.amount),
      category_id: r.categoryId,
      category: r.categoryId ? catMap.get(r.categoryId) : undefined,
      icon: r.icon,
      frequency: r.frequency,
      interval_days: r.intervalDays,
      weekly_day: r.weeklyDay,
      monthly_day: r.monthlyDay,
      start_date: r.startDate,
      end_date: r.endDate,
      display_time: r.displayTime,
      active: r.active,
      display_order: r.displayOrder,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    }));

    const eligible = filterEligible(formatted, targetDate, options);
    return { success: true, data: eligible };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to get eligible regular expenses' };
  }
}

/**
 * Add selected regular expenses as real rows in the `expenses` collection.
 */
export async function addSelectedRegularExpenses(
  items: { regularExpenseId: string; amount: number; description?: string }[],
  paymentMethod: PaymentMethod,
  expenseDate: string
): Promise<ActionResponse<number>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'MongoDB not configured' };
    }

    await connectToDatabase();
    const userId = await resolveUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    if (!items || items.length === 0) {
      return { success: false, error: 'No items selected.' };
    }

    const ids = items.map((i) => i.regularExpenseId);
    const regularExpenses = await RegularExpenseModel.find({ _id: { $in: ids }, userId }).lean();
    const regMap = new Map(regularExpenses.map((r: any) => [r._id.toString(), r]));

    const expenseInserts = [];
    for (const item of items) {
      const reg = regMap.get(item.regularExpenseId);
      if (!reg) continue;

      expenseInserts.push({
        userId,
        categoryId: reg.categoryId || null,
        amount: item.amount > 0 ? item.amount : Number(reg.amount),
        description: item.description?.trim() || reg.name,
        paymentMethod,
        expenseDate,
        notes: null,
        receiptUrl: null,
      });
    }

    if (expenseInserts.length === 0) {
      return { success: false, error: 'None of the selected items were found.' };
    }

    await ExpenseModel.insertMany(expenseInserts);
    return { success: true, data: expenseInserts.length };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) || 'Failed to add selected regular expenses' };
  }
}
