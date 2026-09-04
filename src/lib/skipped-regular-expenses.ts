'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'expenro_skipped_regular_expenses_';
const SKIPPED_EVENT = 'expenro:regular_expenses_skipped';

/**
 * Returns list of skipped regular expense IDs for a specific date (YYYY-MM-DD).
 */
export function getSkippedRegularExpenseIds(dateStr: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateStr}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
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
      localStorage.setItem(`${STORAGE_PREFIX}${dateStr}`, JSON.stringify(updated));
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
    localStorage.setItem(`${STORAGE_PREFIX}${dateStr}`, JSON.stringify(updated));
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
  const [skippedIds, setSkippedIds] = useState<string[]>(() => getSkippedRegularExpenseIds(dateStr));

  const refresh = useCallback(() => {
    setSkippedIds(getSkippedRegularExpenseIds(dateStr));
  }, [dateStr]);

  useEffect(() => {
    refresh();

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (!custom.detail?.date || custom.detail.date === dateStr) {
        refresh();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${STORAGE_PREFIX}${dateStr}`) {
        refresh();
      }
    };

    window.addEventListener(SKIPPED_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SKIPPED_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [dateStr, refresh]);

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
