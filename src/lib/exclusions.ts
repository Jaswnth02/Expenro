'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export const EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX = 'expenro_excluded_categories_';
export const LEGACY_EXCLUDED_CATEGORIES_KEY = 'expenro_excluded_categories_from_total';
export const EXCLUSIONS_CHANGED_EVENT = 'expenro:exclusions-changed';

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
  if (typeof window === 'undefined') return [];
  const monthKey = normalizeMonthKey(monthOrKey, year);
  try {
    const storageKey = `${EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX}${monthKey}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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
          return parsed;
        }
      }
    }

    // Default for any new or other month: no exclusions (everything included)
    return [];
  } catch {
    return [];
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
    localStorage.setItem(storageKey, JSON.stringify(categories));
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
export function filterIncludedExpenses<T extends { category?: { name?: string } | null }>(
  expenses: T[],
  excludedList?: string[],
  monthOrKey?: number | string,
  year?: number
): T[] {
  const list = excludedList !== undefined ? excludedList : getExcludedCategories(monthOrKey, year);
  if (list.length === 0) return expenses;
  return expenses.filter((e) => !isCategoryExcluded(e.category?.name, list));
}

/**
 * Calculates the total sum of expenses belonging to excluded categories for a month.
 */
export function calculateExcludedSum<
  T extends { amount: number | string; category?: { name?: string } | null }
>(expenses: T[], excludedList?: string[], monthOrKey?: number | string, year?: number): number {
  const list = excludedList !== undefined ? excludedList : getExcludedCategories(monthOrKey, year);
  if (list.length === 0) return 0;
  return expenses.reduce((sum, e) => {
    if (isCategoryExcluded(e.category?.name, list)) {
      return sum + Number(e.amount || 0);
    }
    return sum;
  }, 0);
}

/**
 * React hook providing reactive access to month-scoped excluded categories.
 * Whenever month changes or a new month starts, categories default to included.
 */
export function useExcludedCategories(monthOrKey?: number | string, year?: number) {
  const monthKey = normalizeMonthKey(monthOrKey, year);
  const [excludedCategories, setExcludedCategoriesState] = useState<string[]>(() =>
    getExcludedCategories(monthKey)
  );

  const refresh = useCallback(() => {
    setExcludedCategoriesState(getExcludedCategories(monthKey));
  }, [monthKey]);

  useEffect(() => {
    refresh();

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ monthKey?: string; categories?: string[] } | string[]>;
      if ('detail' in customEvent && customEvent.detail) {
        if (Array.isArray(customEvent.detail)) {
          // Legacy payload
          refresh();
        } else if (typeof customEvent.detail === 'object' && customEvent.detail !== null) {
          if (!customEvent.detail.monthKey || customEvent.detail.monthKey === monthKey) {
            refresh();
          }
        }
      } else {
        refresh();
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (
        event.key === `${EXCLUDED_CATEGORIES_STORAGE_KEY_PREFIX}${monthKey}` ||
        event.key === LEGACY_EXCLUDED_CATEGORIES_KEY
      ) {
        refresh();
      }
    };

    window.addEventListener(EXCLUSIONS_CHANGED_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(EXCLUSIONS_CHANGED_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [monthKey, refresh]);

  const isExcluded = useCallback(
    (name: string | undefined | null) => isCategoryExcluded(name, excludedCategories),
    [excludedCategories]
  );

  const toggleExclusion = useCallback(
    (name: string) => {
      return toggleCategoryExclusion(name, monthKey);
    },
    [monthKey]
  );

  const filterIncluded = useCallback(
    <T extends { category?: { name?: string } | null }>(expenses: T[]): T[] => {
      return filterIncludedExpenses(expenses, excludedCategories);
    },
    [excludedCategories]
  );

  const excludedNamesSet = useMemo(() => {
    return new Set(excludedCategories.map((c) => c.trim().toLowerCase()));
  }, [excludedCategories]);

  return {
    monthKey,
    excludedCategories,
    excludedNamesSet,
    isExcluded,
    toggleExclusion,
    filterIncluded,
    hasExclusions: excludedCategories.length > 0,
  };
}
