import React from 'react';
import Link from 'next/link';
import { ArrowRight, Receipt } from 'lucide-react';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecentTransactionsProps {
  expenses: Expense[];
  onAddExpenseClick?: () => void;
}

export function RecentTransactions({
  expenses,
  onAddExpenseClick,
}: RecentTransactionsProps) {
  const recent = expenses.slice(0, 5);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Recent Expenses
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Your latest logged transactions
          </p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No expenses logged yet
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            Start tracking your spending by recording your first transaction.
          </p>
          {onAddExpenseClick && (
            <button
              onClick={onAddExpenseClick}
              className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
            >
              + Add Expense
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {recent.map((exp) => (
            <div
              key={exp.id}
              className="py-3 flex items-center justify-between gap-3 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-1 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: exp.category?.color || '#10B981' }}
                />

                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {exp.description || exp.category?.name || 'Expense'}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>{exp.category?.name || 'General'}</span>
                    <span>•</span>
                    <span>{formatDate(exp.expense_date)}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px] font-medium">
                      {exp.payment_method}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">
                -{formatCurrency(exp.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
