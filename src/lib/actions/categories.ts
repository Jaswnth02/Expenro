'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import { CategoryModel } from '@/lib/mongodb/models';
import { getSessionUser } from '@/lib/auth/session';
import { Category } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/data-service';

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
 * Fetch all available categories (both system/default categories and user's custom categories)
 */
export async function getCategoriesAction(): Promise<ActionResponse<Category[]>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: DEFAULT_CATEGORIES };
    }

    await connectToDatabase();
    const session = await getSessionUser();
    const userId = session?.userId;

    const query = userId ? { $or: [{ userId: null }, { userId }] } : { userId: null };
    const categories = await CategoryModel.find(query).sort({ name: 1 }).lean();

    if (categories.length === 0) {
      // If MongoDB has no categories yet, initialize with default categories
      const docs = DEFAULT_CATEGORIES.map((c) => ({
        userId: null,
        name: c.name,
        type: c.type,
        color: c.color || '#10B981',
        icon: c.icon || 'tag',
      }));
      await CategoryModel.insertMany(docs);
      const reloaded = await CategoryModel.find(query).sort({ name: 1 }).lean();
      return {
        success: true,
        data: reloaded.map((c: any) => ({
          id: c._id.toString(),
          user_id: c.userId,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        })),
      };
    }

    const data: Category[] = categories.map((c: any) => ({
      id: c._id.toString(),
      user_id: c.userId,
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Delete a category by ID.
 */
export async function deleteCategoryAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    if (!isMongoConfigured()) {
      return { success: true, data: true };
    }

    await connectToDatabase();
    await CategoryModel.findByIdAndDelete(id);
    return { success: true, data: true };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Update an existing category by ID.
 */
export async function updateCategoryAction(
  id: string,
  updates: Partial<Category>
): Promise<ActionResponse<Category>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          id,
          user_id: null,
          name: updates.name || 'Category',
          type: updates.type || 'expense',
          color: updates.color || '#10B981',
          icon: updates.icon || 'tag',
          created_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const updated = await CategoryModel.findByIdAndUpdate(
      id,
      {
        ...(updates.name && { name: updates.name }),
        ...(updates.type && { type: updates.type }),
        ...(updates.color && { color: updates.color }),
        ...(updates.icon && { icon: updates.icon }),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return { success: false, error: 'Category not found' };
    }

    return {
      success: true,
      data: {
        id: updated._id.toString(),
        user_id: updated.userId,
        name: updated.name,
        type: updated.type,
        color: updated.color,
        icon: updated.icon,
        created_at: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Create a new category.
 */
export async function createCategoryAction(
  category: Omit<Category, 'id' | 'created_at'>
): Promise<ActionResponse<Category>> {
  try {
    if (!isMongoConfigured()) {
      return {
        success: true,
        data: {
          ...category,
          id: `cat-${Date.now()}`,
          created_at: new Date().toISOString(),
        },
      };
    }

    await connectToDatabase();
    const session = await getSessionUser();

    const created = await CategoryModel.create({
      userId: session?.userId || category.user_id || null,
      name: category.name,
      type: category.type,
      color: category.color || '#10B981',
      icon: category.icon || 'Tag',
    });

    return {
      success: true,
      data: {
        id: created._id.toString(),
        user_id: created.userId,
        name: created.name,
        type: created.type,
        color: created.color,
        icon: created.icon,
        created_at: new Date(created.createdAt).toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: getErrorMessage(err) };
  }
}
