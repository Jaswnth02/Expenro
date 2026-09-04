'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RegularExpense, PaymentMethod } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_ICON_MAP } from '@/components/categories/category-icon';
import {
  Check,
  CheckCheck,
  Zap,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
} from 'lucide-react';
import { formatTime12Hour } from '@/lib/calculations/regular-expenses';
import { useSkippedRegularExpenses } from '@/lib/skipped-regular-expenses';

interface ChecklistItemState {
  expense: RegularExpense;
  selected: boolean;
  customAmount: number;
  isEditingAmount: boolean;
}

interface RegularExpenseChecklistProps {
  eligibleExpenses: RegularExpense[];
  expenseDate: string;
  onDateChange?: (newDate: string) => void;
  onAddSelected: (
    items: { regularExpenseId: string; amount: number; description?: string }[],
    paymentMethod: PaymentMethod
  ) => Promise<void>;
  onClose?: () => void;
  onSwitchToManual?: () => void;
}

export function RegularExpenseChecklist({
  eligibleExpenses,
  expenseDate,
  onDateChange,
  onAddSelected,
  onClose,
  onSwitchToManual,
}: RegularExpenseChecklistProps) {
  const [items, setItems] = useState<ChecklistItemState[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { skippedIds, skip, unskip } = useSkippedRegularExpenses(expenseDate);

  // Initialize/synchronize checklist items when eligibleExpenses or skippedIds change
  useEffect(() => {
    setItems((prevItems) => {
      const prevMap = new Map(prevItems.map((i) => [i.expense.id, i]));
      return eligibleExpenses.map((exp) => {
        const prev = prevMap.get(exp.id);
        const isSkipped = skippedIds.includes(exp.id);
        return {
          expense: exp,
          // If item is skipped for this date, default to unselected
          selected: isSkipped ? false : (prev ? prev.selected : false),
          customAmount: prev ? prev.customAmount : Number(exp.amount),
          isEditingAmount: false,
        };
      });
    });
  }, [eligibleExpenses, skippedIds]);

  const handleSkipItem = (id: string) => {
    skip(id);
    setItems((prev) =>
      prev.map((i) => (i.expense.id === id ? { ...i, selected: false } : i))
    );
  };

  const handleUnskipItem = (id: string) => {
    unskip(id);
  };

  // Calculations
  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + Number(i.customAmount || 0), 0),
    [selectedItems]
  );
  const potentialTotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.customAmount || 0), 0),
    [items]
  );

  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.expense.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const handleToggleSelectAll = () => {
    const nextState = !allSelected;
    setItems((prev) => prev.map((i) => ({ ...i, selected: nextState })));
  };

  const handleAmountChange = (id: string, newAmount: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.expense.id === id ? { ...i, customAmount: Math.max(0.01, newAmount) } : i
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0 || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = selectedItems.map((item) => ({
        regularExpenseId: item.expense.id,
        amount: item.customAmount,
        description: item.expense.name,
      }));

      await onAddSelected(payload, paymentMethod);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to add regular expenses. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header bar with Date Picker & Summary (Section 16 & 25) */}
      <div className="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {items.length} expense{items.length === 1 ? '' : 's'} available
            </span>
            <span className="text-[11px] text-zinc-400">
              Available to add: <strong className="text-zinc-600 dark:text-zinc-300 font-semibold">{formatCurrency(potentialTotal)}</strong>
            </span>
          </div>
        </div>

        {/* Date Selector */}
        {onDateChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-xs font-semibold px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Select All / Deselect All Controls */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <span className="text-xs text-zinc-400 font-medium">
            {selectedItems.length} of {items.length} selected
          </span>
        </div>
      )}

      {/* Eligible Items Checklist */}
      {items.length > 0 ? (
        <div className="flex flex-col gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
          {items.map((item) => {
            const IconComp = CATEGORY_ICON_MAP[item.expense.icon || ''] || CATEGORY_ICON_MAP['Tag'];
            const isSelected = item.selected;
            const isSkipped = skippedIds.includes(item.expense.id);

            return (
              <div
                key={item.expense.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/50 shadow-xs'
                    : isSkipped
                    ? 'bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-70'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Left: Checkbox & Info */}
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                  onClick={() => handleToggleItem(item.expense.id)}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                        : 'border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: item.expense.category?.color
                        ? `${item.expense.category.color}15`
                        : 'rgba(16, 185, 129, 0.1)',
                      color: item.expense.category?.color || '#10B981',
                    }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  {/* Name & Category */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs sm:text-sm font-bold truncate ${isSkipped ? 'text-zinc-500 dark:text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {item.expense.name}
                      </span>
                      {isSkipped && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60">
                          Skipped Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.expense.category && (
                        <span className="text-[10px] text-zinc-400 font-medium truncate">
                          {item.expense.category.name}
                        </span>
                      )}
                      {item.expense.display_time && (
                        <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          After {formatTime12Hour(item.expense.display_time)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Custom Amount Input and Skip/Undo Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative flex items-center">
                    <span className="text-xs font-bold text-zinc-400 mr-1">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled={isSkipped}
                      value={item.customAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleAmountChange(item.expense.id, isNaN(val) ? 0 : val);
                      }}
                      onFocus={() => {
                        if (!item.selected && !isSkipped) handleToggleItem(item.expense.id);
                      }}
                      title="Adjust amount for this transaction"
                      className={`w-18 px-2 py-1 border rounded-lg text-xs font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isSkipped
                          ? 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-400 cursor-not-allowed'
                          : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100'
                      }`}
                    />
                  </div>

                  {isSkipped ? (
                    <button
                      type="button"
                      onClick={() => handleUnskipItem(item.expense.id)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-900/60 transition-colors cursor-pointer"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSkipItem(item.expense.id)}
                      title={`Skip ${item.expense.name} for this date`}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-zinc-200/80 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State for Selected Date */
        <div className="py-6 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
            No regular expenses scheduled for this date
          </span>
          <p className="text-[11px] text-zinc-400 max-w-xs">
            Either none are scheduled for {expenseDate}, or all configured shortcuts have expired or are turned off.
          </p>
          {onSwitchToManual && (
            <button
              type="button"
              onClick={onSwitchToManual}
              className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Add a manual expense instead →
            </button>
          )}
        </div>
      )}

      {/* Payment Method Selection (Section 19) */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Payment Method
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {(['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Other'] as PaymentMethod[]).map(
            (method) => {
              const isChosen = paymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center truncate ${
                    isChosen
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                      : 'bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {method}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Area */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
        <div className="flex flex-col">
          <span className="text-[11px] text-zinc-400">Selected Total</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(selectedTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={selectedItems.length === 0 || isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-emerald-600/25 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Expenses...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Add Selected ({selectedItems.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
