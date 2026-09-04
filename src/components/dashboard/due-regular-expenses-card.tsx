'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { RegularExpense, PaymentMethod, Expense } from '@/types';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { formatCurrency, getTodayDateString } from '@/lib/utils';
import { formatTime12Hour, getCurrentTimeString } from '@/lib/calculations/regular-expenses';
import { CATEGORY_ICON_MAP } from '@/components/categories/category-icon';
import {
  getSkippedRegularExpenseIds,
  skipRegularExpense,
  unskipRegularExpense,
  useSkippedRegularExpenses,
} from '@/lib/skipped-regular-expenses';

interface DueRegularExpensesCardProps {
  refreshKey?: number;
  onExpenseAdded?: () => void;
  onOpenChecklistModal?: () => void;
}

export function DueRegularExpensesCard({
  refreshKey = 0,
  onExpenseAdded,
  onOpenChecklistModal,
}: DueRegularExpensesCardProps) {
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [dueExpenses, setDueExpenses] = useState<RegularExpense[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skippedNotice, setSkippedNotice] = useState<{ id: string; name: string } | null>(null);

  const today = getTodayDateString();
  const { skippedIds } = useSkippedRegularExpenses(today);

  // Auto-clear skip undo notice after 6 seconds
  useEffect(() => {
    if (skippedNotice) {
      const timer = setTimeout(() => {
        setSkippedNotice(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [skippedNotice]);

  const loadDueExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const enabled = await SupabaseFinanceService.getRegularExpensesSettings();
      setIsEnabled(enabled);
      if (!enabled) {
        setDueExpenses([]);
        return;
      }

      // 1. Get eligible regular expenses whose time has arrived for today
      const eligible = await SupabaseFinanceService.getEligibleRegularExpenses(today, {
        checkTime: true,
        currentTime: getCurrentTimeString(),
      });

      // 2. Fetch today's already logged expenses to filter out ones already added
      const [yearStr, monthStr] = today.split('-');
      const allExpenses: Expense[] = await SupabaseFinanceService.getExpenses(
        Number(monthStr),
        Number(yearStr)
      );
      const todayExpenses = allExpenses.filter((exp) => exp.expense_date === today);

      const loggedNames = new Set(
        todayExpenses.map((exp) => exp.description?.toLowerCase().trim())
      );

      const currentSkipped = getSkippedRegularExpenseIds(today);

      // Filter out items already logged today AND items skipped for today
      const unlogged = eligible.filter((item) => {
        const nameKey = item.name.toLowerCase().trim();
        const isLogged = loggedNames.has(nameKey);
        const isSkipped = currentSkipped.includes(item.id);
        return !isLogged && !isSkipped;
      });

      setDueExpenses(unlogged);
      // Pre-select all unlogged due items for convenient 1-tap logging
      setSelectedIds(new Set(unlogged.map((e) => e.id)));

      const initAmounts: Record<string, number> = {};
      unlogged.forEach((e) => {
        initAmounts[e.id] = e.amount;
      });
      setCustomAmounts(initAmounts);
    } catch {
      setDueExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadDueExpenses();
  }, [loadDueExpenses, refreshKey, skippedIds]);

  const handleSkip = (id: string, name: string) => {
    skipRegularExpense(today, id);
    setSkippedNotice({ id, name });
    loadDueExpenses();
  };

  const handleUndoSkip = (id: string) => {
    unskipRegularExpense(today, id);
    setSkippedNotice(null);
    loadDueExpenses();
  };

  // If feature is disabled or loading, hide card
  if (!isEnabled || loading) {
    return null;
  }

  // If no expenses are due right now
  if (dueExpenses.length === 0) {
    if (skippedNotice) {
      return (
        <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 p-2.5 sm:p-3 flex items-center justify-between text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 min-w-0 truncate">
            <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              Skipped <strong>{skippedNotice.name}</strong> for today.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUndoSkip(skippedNotice.id)}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-2 py-0.5 rounded-md shrink-0 cursor-pointer"
          >
            Undo
          </button>
        </div>
      );
    }
    return null;
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const selectedTotal = dueExpenses
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + (customAmounts[e.id] ?? e.amount), 0);

  const handleAddSelected = async () => {
    if (selectedCount === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const itemsToAdd = dueExpenses
        .filter((e) => selectedIds.has(e.id))
        .map((e) => ({
          regularExpenseId: e.id,
          amount: customAmounts[e.id] ?? e.amount,
          description: e.name,
        }));

      await SupabaseFinanceService.addSelectedRegularExpenses(
        itemsToAdd,
        paymentMethod,
        today
      );

      setSuccessMessage(`Logged ${itemsToAdd.length} expense${itemsToAdd.length > 1 ? 's' : ''}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        loadDueExpenses();
        if (onExpenseAdded) onExpenseAdded();
      }, 900);
    } catch {
      // Fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/15 p-3 sm:p-3.5 shadow-2xs relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Background ambient decoration */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="w-3 h-3 fill-current" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Ready to Fill
            </h3>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shrink-0">
              {dueExpenses.length} Due
            </span>
          </div>
        </div>

        {onOpenChecklistModal && (
          <button
            type="button"
            onClick={onOpenChecklistModal}
            className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer shrink-0"
          >
            <span>All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Skipped Notice Banner with Undo */}
      {skippedNotice && (
        <div className="flex items-center justify-between gap-2 p-2 mb-2 bg-amber-500/10 border border-amber-500/20 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs animate-in fade-in">
          <span className="truncate">
            Skipped <strong>{skippedNotice.name}</strong> for today.
          </span>
          <button
            type="button"
            onClick={() => handleUndoSkip(skippedNotice.id)}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0 cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}

      {/* Compact Expense Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 mb-2.5 relative z-10">
        {dueExpenses.map((expense) => {
          const isSelected = selectedIds.has(expense.id);
          const IconComponent =
            CATEGORY_ICON_MAP[expense.icon || 'Tag'] || CATEGORY_ICON_MAP['Tag'];

          return (
            <div
              key={expense.id}
              onClick={() => toggleSelect(expense.id)}
              className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-white dark:bg-zinc-900 border-amber-400/80 dark:border-amber-600/70 shadow-2xs ring-1 ring-amber-500/20'
                  : 'bg-white/50 dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Checkbox */}
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-white'
                      : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                {/* Category Icon */}
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: expense.category?.color
                      ? `${expense.category.color}15`
                      : 'rgba(245, 158, 11, 0.1)',
                    color: expense.category?.color || '#f59e0b',
                  }}
                >
                  <IconComponent className="w-3 h-3" />
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {expense.name}
                  </span>
                  {expense.display_time && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                      • {formatTime12Hour(expense.display_time)}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount Display & Skip button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(customAmounts[expense.id] ?? expense.amount)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip(expense.id, expense.name);
                  }}
                  title={`Skip ${expense.name} for today`}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                >
                  Skip
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Action Footer: 1 Clean Row */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/15 dark:border-amber-500/10 relative z-10">
        {/* Payment Method Selector */}
        <div className="flex items-center gap-1 select-none">
          {(['UPI', 'Cash'] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                paymentMethod === method
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {method}
            </button>
          ))}
          <select
            value={['UPI', 'Cash'].includes(paymentMethod) ? '' : paymentMethod}
            onChange={(e) => e.target.value && setPaymentMethod(e.target.value as PaymentMethod)}
            aria-label="More payment methods"
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              !['UPI', 'Cash'].includes(paymentMethod)
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80'
            }`}
          >
            <option value="" disabled hidden>
              {!['UPI', 'Cash'].includes(paymentMethod) ? paymentMethod : 'More ▾'}
            </option>
            <option value="Debit Card">Debit Card</option>
            <option value="Credit Card">Credit Card</option>
          </select>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={selectedCount === 0 || isSubmitting}
          onClick={handleAddSelected}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0 ${
            selectedCount > 0 && !isSubmitting
              ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 shadow-amber-500/25'
              : 'bg-zinc-300 dark:bg-zinc-700 opacity-60 cursor-not-allowed'
          }`}
        >
          <Zap className="w-3 h-3 fill-current" />
          <span>
            {isSubmitting
              ? 'Adding...'
              : `Add Selected (${formatCurrency(selectedTotal)})`}
          </span>
        </button>
      </div>
    </div>
  );
}
