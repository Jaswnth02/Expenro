'use client';

import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_PREFIX = 'expenro_skipped_regular_expenses_';
const SKIPPED_EVENT = 'expenro:regular_expenses_skipped';

const emptyArray: string[] = [];
const snapshotCache = new Map<string, { raw: string | null; data: string[] }>();

/**
 * Returns list of skipped regular expense IDs for a specific date (YYYY-MM-DD).
 */
export function getSkippedRegularExpenseIds(dateStr: string): string[] {
  if (typeof window === 'undefined') return emptyArray;
  try {
    const storageKey = `${STORAGE_PREFIX}${dateStr}`;
    const raw = localStorage.getItem(storageKey);
    const cached = snapshotCache.get(dateStr);
    if (cached && cached.raw === raw) {
      return cached.data;
    }
    if (!raw) {
      snapshotCache.set(dateStr, { raw: null, data: emptyArray });
      return emptyArray;
    }
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed) ? parsed : emptyArray;
    snapshotCache.set(dateStr, { raw, data });
    return data;
  } catch {
    return emptyArray;
  }
}

/**
 * Marks a regular expense as skipped for a specific date.
 */
export function skipRegularExpense(dateStr: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSkippedRegularExpenseIds(dateStr);
    if (!current.includes(id)) {
      const updated = [...current, id];
      const raw = JSON.stringify(updated);
      localStorage.setItem(`${STORAGE_PREFIX}${dateStr}`, raw);
      snapshotCache.set(dateStr, { raw, data: updated });
      window.dispatchEvent(new CustomEvent(SKIPPED_EVENT, { detail: { date: dateStr, id, action: 'skip' } }));
    }
  } catch (err) {
    console.error('Failed to skip regular expense:', err);
  }
}

/**
 * Unskips (restores) a regular expense for a specific date.
 */
export function unskipRegularExpense(dateStr: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSkippedRegularExpenseIds(dateStr);
    const updated = current.filter((item) => item !== id);
    const raw = JSON.stringify(updated);
    localStorage.setItem(`${STORAGE_PREFIX}${dateStr}`, raw);
    snapshotCache.set(dateStr, { raw, data: updated });
    window.dispatchEvent(new CustomEvent(SKIPPED_EVENT, { detail: { date: dateStr, id, action: 'unskip' } }));
  } catch (err) {
    console.error('Failed to unskip regular expense:', err);
  }
}

/**
 * Checks whether a regular expense is skipped for a specific date.
 */
export function isRegularExpenseSkipped(dateStr: string, id: string): boolean {
  const list = getSkippedRegularExpenseIds(dateStr);
  return list.includes(id);
}

/**
 * React hook to reactively track skipped regular expenses for a given date.
 */
export function useSkippedRegularExpenses(dateStr: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleCustomEvent = (e: Event) => {
        const custom = e as CustomEvent;
        if (!custom.detail?.date || custom.detail.date === dateStr) {
          snapshotCache.delete(dateStr);
          onStoreChange();
        }
      };

      const handleStorage = (e: StorageEvent) => {
        if (e.key === `${STORAGE_PREFIX}${dateStr}`) {
          snapshotCache.delete(dateStr);
          onStoreChange();
        }
      };

      window.addEventListener(SKIPPED_EVENT, handleCustomEvent);
      window.addEventListener('storage', handleStorage);

      return () => {
        window.removeEventListener(SKIPPED_EVENT, handleCustomEvent);
        window.removeEventListener('storage', handleStorage);
      };
    },
    [dateStr]
  );

  const getSnapshot = useCallback(() => getSkippedRegularExpenseIds(dateStr), [dateStr]);
  const getServerSnapshot = useCallback(() => emptyArray, []);

  const skippedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const skip = useCallback(
    (id: string) => {
      skipRegularExpense(dateStr, id);
    },
    [dateStr]
  );

  const unskip = useCallback(
    (id: string) => {
      unskipRegularExpense(dateStr, id);
    },
    [dateStr]
  );

  return { skippedIds, skip, unskip };
}
