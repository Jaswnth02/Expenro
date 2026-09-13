'use client';

import { useSyncExternalStore, useCallback, useMemo } from 'react';

export const EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX = 'expenro_excluded_categories_';
export const LEGACY_EXCLUDED_CATEGORIES_KEY = 'expenro_excluded_categories_from_total';
export const EXCLUSIONS_CHANGED_EVENT = 'expenro:exclusions-changed';

const emptyArray: string[] = [];
// Stable snapshot cache to ensure referential equality for useSyncExternalStore
const snapshotCache = new Map<string, { raw: string | null; data: string[] }>();

/**
 * Normalizes a month/year combination or string into a standardized YYYY-MM key.
 */
export function normalizeMonthKey(monthOrKey?: number | string, year?: number): string {
  if (typeof monthOrKey === 'string' && monthOrKey.includes('-')) {
    return monthOrKey.trim();
  }
  if (typeof monthOrKey === 'number' && typeof year === 'number') {
    const m = String(monthOrKey).padStart(2, '0');
    return `${year}-${m}`;
  }
  // Default to September 2026 (or current active app period)
  return '2026-09';
}

/**
 * Reads excluded categories list for a specific month (YYYY-MM) from localStorage safely.
 * When a new month starts (or for any month where exclusions were not set), it returns []
 * ensuring categories are included by default in their respective months.
 */
export function getExcludedCategories(monthOrKey?: number | string, year?: number): string[] {
  if (typeof window === 'undefined') return emptyArray;
  const monthKey = normalizeMonthKey(monthOrKey, year);
  try {
    const storageKey = `${EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX}${monthKey}`;
    const raw = localStorage.getItem(storageKey);
    const cached = snapshotCache.get(monthKey);
    if (cached && cached.raw === raw) {
      return cached.data;
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      const data = Array.isArray(parsed) ? parsed : emptyArray;
      snapshotCache.set(monthKey, { raw, data });
      return data;
    }

    // Seamless migration: If current month (2026-09) has no scoped entry yet,
    // migrate from the legacy global key if it exists.
    if (monthKey === '2026-09') {
      const legacyRaw = localStorage.getItem(LEGACY_EXCLUDED_CATEGORIES_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem(storageKey, legacyRaw);
          localStorage.removeItem(LEGACY_EXCLUDED_CATEGORIES_KEY);
          snapshotCache.set(monthKey, { raw: legacyRaw, data: parsed });
          return parsed;
        }
      }
    }

    // Default for September 2026: Exclude Mess Food by default so meal dues stay in the meal tracker
    if (monthKey === '2026-09') {
      const defaultSept = ['Mess Food'];
      snapshotCache.set(monthKey, { raw: null, data: defaultSept });
      return defaultSept;
    }

    // Default for other months: no exclusions
    snapshotCache.set(monthKey, { raw: null, data: emptyArray });
    return emptyArray;
  } catch {
    return emptyArray;
  }
}

/**
 * Saves excluded categories to localStorage for a specific month
 * and broadcasts an event to sync all open components.
 */
export function setExcludedCategories(
  categories: string[],
  monthOrKey?: number | string,
  year?: number
): void {
  if (typeof window === 'undefined') return;
  const monthKey = normalizeMonthKey(monthOrKey, year);
  try {
    const storageKey = `${EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX}${monthKey}`;
    const raw = JSON.stringify(categories);
    localStorage.setItem(storageKey, raw);
    snapshotCache.set(monthKey, { raw, data: categories });
    window.dispatchEvent(
      new CustomEvent(EXCLUSIONS_CHANGED_EVENT, {
        detail: { monthKey, categories },
      })
    );
  } catch {
    // Ignore storage quota or private mode issues
  }
}

/**
 * Checks if a given category name is in the excluded categories list (case-insensitive & trimmed).
 */
export function isCategoryExcluded(
  categoryName: string | undefined | null,
  excludedList?: string[],
  monthOrKey?: number | string,
  year?: number
): boolean {
  if (!categoryName) return false;
  const list = excludedList !== undefined ? excludedList : getExcludedCategories(monthOrKey, year);
  const target = categoryName.trim().toLowerCase();
  return list.some((c) => c.trim().toLowerCase() === target);
}

/**
 * Checks if an individual expense is excluded.
 * Daily unpaid meal notes remain excluded, but when a monthly mess food bill is paid
 * (e.g. via "Pay at Once" or settled expense), it is INCLUDED in expenses and wallet balance.
 */
export function isExpenseExcluded<
  T extends {
    category?: { name?: string } | null;
    description?: string;
    notes?: string | null;
    is_settled?: boolean;
  }
>(
  expense: T | undefined | null,
  excludedList?: string[],
  monthOrKey?: number | string,
  year?: number
): boolean {
  if (!expense || !expense.category?.name) return false;
  const catName = expense.category.name;

  if (!isCategoryExcluded(catName, excludedList, monthOrKey, year)) {
    return false;
  }

  // If this expense is a paid consolidated monthly settlement bill, it MUST be included!
  const desc = (expense.description || '').toLowerCase();
  const notes = (expense.notes || '').toLowerCase();
  const isSettledPayment =
    (expense as { is_settled?: boolean }).is_settled === true ||
    desc.startsWith('mess food bill') ||
    desc.includes('food bill settlement') ||
    desc.includes('meal bill settlement') ||
    notes.includes('consolidated monthly food bill') ||
    notes.includes('settlement');

  if (isSettledPayment) {
    return false; // Paid settlement is included in active expenses
  }

  return true; // Unpaid daily meal notes remain excluded
}

/**
 * Toggles a category between excluded (OFF) and included (ON) for a specific month.
 */
export function toggleCategoryExclusion(
  categoryName: string,
  monthOrKey?: number | string,
  year?: number
): string[] {
  const current = getExcludedCategories(monthOrKey, year);
  const target = categoryName.trim().toLowerCase();
  const exists = current.some((c) => c.trim().toLowerCase() === target);

  let updated: string[];
  if (exists) {
    // Was excluded -> Now included
    updated = current.filter((c) => c.trim().toLowerCase() !== target);
  } else {
    // Was included -> Now excluded
    updated = [...current, categoryName.trim()];
  }

  setExcludedCategories(updated, monthOrKey, year);
  return updated;
}

/**
 * Filters a list of expenses to return only those belonging to included categories for a month.
 */
export function filterIncludedExpenses<
  T extends { category?: { name?: string } | null; description?: string; notes?: string | null; is_settled?: boolean }
>(
  expenses: T[],
  excludedList?: string[],
  monthOrKey?: number | string,
  year?: number
): T[] {
  const list = excludedList !== undefined ? excludedList : getExcludedCategories(monthOrKey, year);
  if (list.length === 0) return expenses;
  return expenses.filter((e) => !isExpenseExcluded(e, list, monthOrKey, year));
}

/**
 * Calculates the total sum of expenses belonging to excluded categories for a month.
 */
export function calculateExcludedSum<
  T extends { amount: number | string; category?: { name?: string } | null; description?: string; notes?: string | null; is_settled?: boolean }
>(expenses: T[], excludedList?: string[], monthOrKey?: number | string, year?: number): number {
  const list = excludedList !== undefined ? excludedList : getExcludedCategories(monthOrKey, year);
  if (list.length === 0) return 0;
  return expenses.reduce((sum, e) => {
    if (isExpenseExcluded(e, list, monthOrKey, year)) {
      return sum + Number(e.amount || 0);
    }
    return sum;
  }, 0);
}

/**
 * React hook providing reactive access to month-scoped excluded categories.
 * Uses useSyncExternalStore for hydration-safe server and client synchronization.
 */
export function useExcludedCategories(monthOrKey?: number | string, year?: number) {
  const monthKey = normalizeMonthKey(monthOrKey, year);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleCustomEvent = (event: Event) => {
        const customEvent = event as CustomEvent<{ monthKey?: string; categories?: string[] } | string[]>;
        if ('detail' in customEvent && customEvent.detail) {
          if (Array.isArray(customEvent.detail)) {
            snapshotCache.delete(monthKey);
            onStoreChange();
          } else if (typeof customEvent.detail === 'object' && customEvent.detail !== null) {
            if (!customEvent.detail.monthKey || customEvent.detail.monthKey === monthKey) {
              snapshotCache.delete(monthKey);
              onStoreChange();
            }
          }
        } else {
          snapshotCache.delete(monthKey);
          onStoreChange();
        }
      };

      const handleStorageEvent = (event: StorageEvent) => {
        if (
          event.key === `${EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX}${monthKey}` ||
          event.key === LEGACY_EXCLUDED_CATEGORIES_KEY
        ) {
          snapshotCache.delete(monthKey);
          onStoreChange();
        }
      };

      window.addEventListener(EXCLUSIONS_CHANGED_EVENT, handleCustomEvent);
      window.addEventListener('storage', handleStorageEvent);

      return () => {
        window.removeEventListener(EXCLUSIONS_CHANGED_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorageEvent);
      };
    },
    [monthKey]
  );

  const getSnapshot = useCallback(() => getExcludedCategories(monthKey), [monthKey]);
  const getServerSnapshot = useCallback(() => emptyArray, []);

  const excludedCategories = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isExcluded = useCallback(
    (
      target:
        | string
        | undefined
        | null
        | { category?: { name?: string } | null; description?: string; notes?: string | null; is_settled?: boolean }
    ) => {
      if (typeof target === 'object' && target !== null) {
        return isExpenseExcluded(target, excludedCategories, monthKey);
      }
      return isCategoryExcluded(target, excludedCategories, monthKey);
    },
    [excludedCategories, monthKey]
  );

  const toggleExclusion = useCallback(
    (name: string) => {
      return toggleCategoryExclusion(name, monthKey);
    },
    [monthKey]
  );

  const filterIncluded = useCallback(
    <T extends { category?: { name?: string } | null; description?: string; notes?: string | null; is_settled?: boolean }>(
      expenses: T[]
    ): T[] => {
      return filterIncludedExpenses(expenses, excludedCategories, monthKey);
    },
    [excludedCategories, monthKey]
  );

  const excludedNamesSet = useMemo(() => {
    return new Set(excludedCategories.map((c) => c.trim().toLowerCase()));
  }, [excludedCategories]);

  return {
    monthKey,
    excludedCategories,
    excludedNamesSet,
    isExcluded,
    isExpenseExcluded: (
      exp: Parameters<typeof isExpenseExcluded>[0]
    ) => isExpenseExcluded(exp, excludedCategories, monthKey),
    toggleExclusion,
    filterIncluded,
    hasExclusions: excludedCategories.length > 0,
  };
}
