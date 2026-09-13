'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  PiggyBank,
  UtensilsCrossed,
  ArrowUpCircle,
  PieChart,
  BarChart3,
  LucideIcon,
} from 'lucide-react';

export type CustomNavTabId = 'savings' | 'meals' | 'income' | 'budgets' | 'reports';

export interface CustomNavTabConfig {
  id: CustomNavTabId;
  label: string;
  shortLabel: string;
  href: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const CUSTOM_NAV_TAB_OPTIONS: Record<CustomNavTabId, CustomNavTabConfig> = {
  savings: {
    id: 'savings',
    label: 'Savings Goals',
    shortLabel: 'Savings',
    href: '/savings',
    icon: PiggyBank,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
    description: 'Track targets, deposits & progress',
  },
  meals: {
    id: 'meals',
    label: 'Meal Tracker',
    shortLabel: 'Meals',
    href: '/meals',
    icon: UtensilsCrossed,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    description: 'Track breakfast, lunch, dinner & monthly mess dues',
  },
  income: {
    id: 'income',
    label: 'Income & Top-ups',
    shortLabel: 'Income',
    href: '/income',
    icon: ArrowUpCircle,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    description: 'Log allowance, salary & replenishment',
  },
  budgets: {
    id: 'budgets',
    label: 'Budgets',
    shortLabel: 'Budgets',
    href: '/budgets',
    icon: PieChart,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
    description: 'Category limits & spending alerts',
  },
  reports: {
    id: 'reports',
    label: 'Analytics & Reports',
    shortLabel: 'Reports',
    href: '/reports',
    icon: BarChart3,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50',
    description: 'Visual charts, spending trends & exports',
  },
};

export const DEFAULT_CUSTOM_NAV_TABS: [CustomNavTabId, CustomNavTabId] = ['savings', 'meals'];

const STORAGE_KEY = 'expenro_custom_nav_tabs';
const UPDATE_EVENT_KEY = 'expenro:nav-tabs-updated';
const OPEN_DRAWER_EVENT_KEY = 'expenro:open-mobile-drawer';

let cachedNavTabsRaw: string | null = null;
let cachedNavTabs: [CustomNavTabId, CustomNavTabId] = DEFAULT_CUSTOM_NAV_TABS;

export function getCustomNavTabs(): [CustomNavTabId, CustomNavTabId] {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOM_NAV_TABS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedNavTabsRaw) {
      return cachedNavTabs;
    }
    cachedNavTabsRaw = raw;
    if (!raw) {
      cachedNavTabs = DEFAULT_CUSTOM_NAV_TABS;
      return cachedNavTabs;
    }
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed[0] in CUSTOM_NAV_TAB_OPTIONS &&
      parsed[1] in CUSTOM_NAV_TAB_OPTIONS &&
      parsed[0] !== parsed[1]
    ) {
      cachedNavTabs = [parsed[0], parsed[1]];
      return cachedNavTabs;
    }
  } catch {
    // Fallback to default
  }
  cachedNavTabs = DEFAULT_CUSTOM_NAV_TABS;
  return cachedNavTabs;
}

export function setCustomNavTabs(tabs: [CustomNavTabId, CustomNavTabId]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(tabs);
    cachedNavTabsRaw = raw;
    cachedNavTabs = tabs;
    localStorage.setItem(STORAGE_KEY, raw);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT_KEY, { detail: tabs }));
  } catch {
    // Storage quota or private mode error handling
  }
}

export function openMobileDrawer(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_DRAWER_EVENT_KEY));
}

export function useCustomNavTabs(): [
  [CustomNavTabId, CustomNavTabId],
  (tabs: [CustomNavTabId, CustomNavTabId]) => void
] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleUpdate = () => {
      cachedNavTabsRaw = null;
      onStoreChange();
    };

    window.addEventListener(UPDATE_EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(UPDATE_EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getSnapshot = useCallback(() => getCustomNavTabs(), []);
  const getServerSnapshot = useCallback(() => DEFAULT_CUSTOM_NAV_TABS, []);

  const tabs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateTabs = useCallback((newTabs: [CustomNavTabId, CustomNavTabId]) => {
    setCustomNavTabs(newTabs);
  }, []);

  return [tabs, updateTabs];
}
