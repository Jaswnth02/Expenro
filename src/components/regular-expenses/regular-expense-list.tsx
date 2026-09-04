'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RegularExpense, Category } from '@/types';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { LocalFinanceStore } from '@/lib/data-service';
import { useAuth } from '@/context/auth-context';
import { RegularExpenseItem } from './regular-expense-item';
import { RegularExpenseForm } from './regular-expense-form';
import { formatCurrency, getTodayDateString } from '@/lib/utils';
import {
  Plus,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Utensils,
  Car,
  ShoppingBag,
} from 'lucide-react';

const SUGGESTIONS = [
  { name: 'Mess - Morning', amount: 50, categoryName: 'Mess Food', icon: 'Utensils', frequency: 'daily' as const, display_time: '08:00' },
  { name: 'Mess - Afternoon', amount: 80, categoryName: 'Mess Food', icon: 'Utensils', frequency: 'daily' as const, display_time: '12:30' },
  { name: 'Mess - Night', amount: 50, categoryName: 'Mess Food', icon: 'Utensils', frequency: 'daily' as const, display_time: '19:30' },
  { name: 'Tea & Snacks', amount: 30, categoryName: 'Tea & Snacks', icon: 'Coffee', frequency: 'daily' as const, display_time: '16:30' },
  { name: 'Travel / Commute', amount: 50, categoryName: 'Travel', icon: 'Car', frequency: 'interval_days' as const, interval_days: 2, display_time: '08:30' },
  { name: 'Grocery Run', amount: 200, categoryName: 'Grocery', icon: 'ShoppingBag', frequency: 'interval_days' as const, interval_days: 7, display_time: '18:00' },
  { name: 'Stationary / Xerox', amount: 30, categoryName: 'Stationary', icon: 'BookOpen', frequency: 'interval_days' as const, interval_days: 3, display_time: '14:00' },
];

export function RegularExpenseList() {
  const { user } = useAuth();
  const userId = user?.id || 'user-default-1';

  const [regularExpenses, setRegularExpenses] = useState<RegularExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RegularExpense | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, enabled, cats] = await Promise.all([
        SupabaseFinanceService.getRegularExpenses(),
        SupabaseFinanceService.getRegularExpensesSettings(),
        SupabaseFinanceService.getCategories(),
      ]);
      setRegularExpenses(list);
      setIsEnabled(enabled);
      setCategories(cats.filter((c) => c.type === 'expense'));
    } catch {
      // Fallback
      setRegularExpenses(LocalFinanceStore.getRegularExpenses());
      setIsEnabled(LocalFinanceStore.getRegularExpensesSettings());
      setCategories(LocalFinanceStore.getCategories().filter((c) => c.type === 'expense'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleGlobal = async (nextState: boolean) => {
    setIsEnabled(nextState);
    await SupabaseFinanceService.setRegularExpensesSettings(nextState);
    showToast(`Regular Expenses ${nextState ? 'enabled' : 'disabled'}.`);
  };

  const handleToggleItem = async (id: string, active: boolean) => {
    try {
      await SupabaseFinanceService.toggleRegularExpense(id, active);
      setRegularExpenses((prev) =>
        prev.map((item) => (item.id === id ? { ...item, active } : item))
      );
    } catch {
      setError('Failed to update regular expense.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await SupabaseFinanceService.deleteRegularExpense(id);
      setRegularExpenses((prev) => prev.filter((item) => item.id !== id));
      showToast('Regular expense deleted. Historical transactions preserved.');
    } catch {
      setError('Failed to delete regular expense.');
    }
  };

  const handleSaveForm = async (payload: any) => {
    if (editingExpense) {
      const updated = await SupabaseFinanceService.updateRegularExpense(editingExpense.id, payload);
      setRegularExpenses((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      showToast('Regular expense updated.');
    } else {
      const created = await SupabaseFinanceService.addRegularExpense(payload);
      setRegularExpenses((prev) => [...prev, created]);
      showToast('Regular expense shortcut added.');
    }
  };

  const handleOpenSuggestion = (sug: typeof SUGGESTIONS[0]) => {
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === sug.categoryName.toLowerCase()
    );

    setEditingExpense({
      id: '',
      user_id: userId,
      name: sug.name,
      amount: sug.amount,
      category_id: matchedCategory ? matchedCategory.id : (categories[0]?.id || null),
      icon: sug.icon,
      frequency: sug.frequency,
      interval_days: sug.interval_days || null,
      weekly_day: null,
      monthly_day: null,
      start_date: getTodayDateString(),
      end_date: null,
      active: true,
      display_order: regularExpenses.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Unified Regular Expenses Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col gap-3.5">
        {/* Header: Title, Status Badge, Global Switch & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Regular Expenses
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Scheduled shortcuts for rapid 1-tap logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {/* Global toggle switch */}
            <button
              type="button"
              onClick={() => handleToggleGlobal(!isEnabled)}
              aria-label="Toggle Regular Expenses globally"
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                isEnabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.75 ${
                  isEnabled ? 'left-4.5' : 'left-0.75'
                }`}
              />
            </button>

            {/* Add button */}
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Shortcut</span>
            </button>
          </div>
        </div>

        {/* List of items */}
        {isLoading ? (
          <div className="py-6 text-center text-xs text-zinc-400">Loading regular expenses...</div>
        ) : !isEnabled ? (
          <div className="py-4 text-center text-xs text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            Regular expenses automation is currently turned off. Switch it ON above to enable daily shortcuts.
          </div>
        ) : regularExpenses.length > 0 ? (
          <div className="flex flex-col gap-2">
            {regularExpenses.map((expense) => (
              <RegularExpenseItem
                key={expense.id}
                expense={expense}
                onEdit={(exp) => {
                  setEditingExpense(exp);
                  setIsFormOpen(true);
                }}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-6 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                No regular expenses configured yet
              </h4>
              <p className="text-[11px] text-zinc-400 max-w-sm mt-0.5">
                Pick a suggestion below or click Add to create your first recurring shortcut.
              </p>
            </div>
          </div>
        )}

        {/* First-Time Suggestions */}
        {isEnabled && (
          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                Suggested Quick Shortcuts
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-1.5">
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug.name}
                  type="button"
                  onClick={() => handleOpenSuggestion(sug)}
                  className="p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500/60 bg-zinc-50/60 dark:bg-zinc-950/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                      {sug.name}
                    </span>
                    <Plus className="w-2.5 h-2.5 text-zinc-400 group-hover:text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sug.amount)}
                    </span>
                    <span className="capitalize">{sug.frequency === 'daily' ? 'Daily' : '2d'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <RegularExpenseForm
        isOpen={isFormOpen}
        initialData={editingExpense}
        categories={categories}
        userId={userId}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveForm}
      />
    </div>
  );
}
