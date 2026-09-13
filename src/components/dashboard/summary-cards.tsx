'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Wallet, AlertTriangle, Pencil } from 'lucide-react';
import { FinancialSummary, Expense, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useExcludedCategories, isExpenseExcluded } from '@/lib/exclusions';

interface SummaryCardsProps {
  summary: FinancialSummary;
  expenses?: Expense[];
  categories?: Category[];
  selectedMonth?: number;
  selectedYear?: number;
  onOpenSetBalance?: () => void;
}

export function SummaryCards({
  summary,
  expenses = [],
  selectedMonth,
  selectedYear,
  onOpenSetBalance,
}: SummaryCardsProps) {
  const now = new Date();
  const activeMonth = selectedMonth ?? summary.month ?? (now.getMonth() + 1);
  const activeYear = selectedYear ?? summary.year ?? now.getFullYear();

  // Month-scoped categories excluded from Total Expenses calculation
  const { excludedCategories } = useExcludedCategories(activeMonth, activeYear);

  // Calculate sum of all excluded categories for the month
  const { excludedSum, excludedNames } = useMemo(() => {
    if (excludedCategories.length === 0) return { excludedSum: 0, excludedNames: [] };
    let sum = 0;
    const namesSet = new Set<string>();

    expenses.forEach((e) => {
      if (isExpenseExcluded(e, excludedCategories)) {
        sum += Number(e.amount || 0);
        const catName = (e.category?.name || 'Other').trim();
        namesSet.add(catName);
      }
    });

    return { excludedSum: sum, excludedNames: Array.from(namesSet) };
  }, [expenses, excludedCategories]);

  // summary.totalExpenses passed from dashboard page is already adjusted for excluded categories
  const displayedTotalExpenses = summary.totalExpenses;

  // Real running available wallet balance (not reset monthly)
  const realAvailableBalance =
    summary.availableBalance !== undefined
      ? summary.availableBalance
      : summary.remainingBalance !== undefined
      ? summary.remainingBalance
      : summary.totalIncome - displayedTotalExpenses;

  const lowThreshold = summary.lowBalanceThreshold ?? 1000;
  const isLowBalance = summary.isLowBalance ?? (realAvailableBalance < lowThreshold);
  const isDepleted = realAvailableBalance <= 0;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full min-w-0">
      {/* Card 1: Total Expenses (Resets to 0 on 1st of every month) */}
      <div
        id="card-total-expenses"
        className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between min-w-0 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-1 gap-1 min-w-0">
          <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate min-w-0">
            Total Expenses
          </span>
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            {formatCurrency(displayedTotalExpenses)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
            {excludedSum > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Excl. {excludedNames.join(', ')}
              </span>
            ) : displayedTotalExpenses === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Reset for this month
              </span>
            ) : (
              'Spent this month'
            )}
          </p>
        </div>
      </div>

      {/* Card 2: Remaining Balance (Running Wallet Balance) */}
      <div
        id="card-available-balance"
        onClick={onOpenSetBalance}
        role={onOpenSetBalance ? 'button' : undefined}
        tabIndex={onOpenSetBalance ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onOpenSetBalance) {
            e.preventDefault();
            onOpenSetBalance();
          }
        }}
        className={`p-3 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between min-w-0 overflow-hidden ${
          onOpenSetBalance ? 'cursor-pointer active:scale-[0.99] group' : ''
        } ${
          isLowBalance
            ? 'border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-500/20 bg-amber-50/10'
            : 'border-zinc-200/80 dark:border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1 gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
              Remaining Balance
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenSetBalance && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-[9px] sm:text-[10px] border border-teal-500/25 group-hover:bg-teal-500/20 transition-colors"
                title="Click to set custom balance"
              >
                <span>Edit</span>
                <Pencil className="w-2.5 h-2.5" />
              </span>
            )}
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg shrink-0 ${
                isDepleted
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : isLowBalance
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
              } flex items-center justify-center`}
            >
              {isLowBalance ? (
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
              ) : (
                <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
            </div>
          </div>
        </div>

        <div>
          <div
            className={`text-lg sm:text-2xl font-extrabold tracking-tight truncate ${
              isDepleted
                ? 'text-rose-600 dark:text-rose-400'
                : isLowBalance
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            {formatCurrency(realAvailableBalance)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center justify-between gap-1">
            <span className="truncate">
              {isDepleted ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Deficit
                </span>
              ) : isLowBalance ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Below ₹{lowThreshold.toLocaleString('en-IN')}
                </span>
              ) : (
                'Running wallet'
              )}
            </span>
            {onOpenSetBalance ? (
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline shrink-0 ml-1 inline-flex items-center gap-0.5">
                <span>Set Balance</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </span>
            ) : isLowBalance ? (
              <Link
                href="/income"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0 ml-1"
              >
                + Top-up &rarr;
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
