'use client';

import React, { useState } from 'react';
import { RegularExpense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatFrequencyDescription, formatTime12Hour } from '@/lib/calculations/regular-expenses';
import { CATEGORY_ICON_MAP } from '@/components/categories/category-icon';
import { Edit2, Trash2, Calendar, AlertTriangle, X, Clock } from 'lucide-react';

interface RegularExpenseItemProps {
  expense: RegularExpense;
  onEdit: (expense: RegularExpense) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => Promise<void>;
}

export function RegularExpenseItem({
  expense,
  onEdit,
  onToggle,
  onDelete,
}: RegularExpenseItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const IconComponent = CATEGORY_ICON_MAP[expense.icon || ''] || CATEGORY_ICON_MAP['Tag'];
  const frequencyLabel = formatFrequencyDescription(expense);

  const dateRangeLabel = expense.end_date
    ? `${formatDate(expense.start_date)} – ${formatDate(expense.end_date)}`
    : `${formatDate(expense.start_date)} – No End Date`;

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await onDelete(expense.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`p-2.5 sm:p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-150 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
          expense.active
            ? 'border-zinc-200 dark:border-zinc-800'
            : 'border-zinc-200/50 dark:border-zinc-800/40 opacity-70 bg-zinc-50/50 dark:bg-zinc-950/40'
        }`}
      >
        {/* Left: Icon, Name, Category, Frequency, Dates */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: expense.category?.color
                ? `${expense.category.color}18`
                : 'rgba(16, 185, 129, 0.1)',
              color: expense.category?.color || '#10B981',
            }}
          >
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {expense.name}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(expense.amount)}
              </span>
              {expense.category && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {expense.category.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex-wrap">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded text-[10px]">
                {frequencyLabel}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Calendar className="w-3 h-3" />
                {dateRangeLabel}
              </span>
              {expense.display_time && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                    <Clock className="w-3 h-3" />
                    After {formatTime12Hour(expense.display_time)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Toggle Switch & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/80 shrink-0">
          {/* Active Switch */}
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold ${
                expense.active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-400'
              }`}
            >
              {expense.active ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              onClick={() => onToggle(expense.id, !expense.active)}
              aria-label={`Toggle active state for ${expense.name}`}
              className={`w-8 h-[18px] rounded-full transition-colors relative cursor-pointer ${
                expense.active ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-all absolute top-[3px] ${
                  expense.active ? 'left-[17px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>

          <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(expense)}
              title="Edit regular expense"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete regular expense"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Section 23) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Regular Expense?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    &quot;{expense.name}&quot;
                  </span>{' '}
                  will be removed from your shortcuts.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Previous expense transactions will not be deleted. Historical data remains intact.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
