'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Wallet, AlertTriangle } from 'lucide-react';
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
  const activeMonth = selectedMonth ?? summary.month ?? 9;
  const activeYear = selectedYear ?? summary.year ?? 2026;

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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
      {/* Card 1: Income / Top-ups */}
      <Link
        href="/income"
        id="card-total-income"
        className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm hover:border-emerald-500/40 transition-all duration-150 flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Income / Top-ups
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate flex items-center justify-between">
            <span>
              {summary.totalIncome > 0
                ? 'Credited this month'
                : summary.lastIncome
                ? `Last: ${formatCurrency(summary.lastIncome.amount)} (${summary.lastIncome.source})`
                : 'Sent when low'}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">
              Manage &rarr;
            </span>
          </p>
        </div>
      </Link>

      {/* Card 2: Total Expenses */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            Total Expenses
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(displayedTotalExpenses)}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
            {excludedSum > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Excl. {excludedNames.join(', ')}
              </span>
            ) : (
              'Spent this month'
            )}
          </p>
        </div>
      </div>

      {/* Card 3: Available Balance (Running Wallet Balance) */}
      <div
        id="card-available-balance"
        className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between ${
          isLowBalance
            ? 'border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-500/20 bg-amber-50/10'
            : 'border-zinc-200/80 dark:border-zinc-800'
        }`}
      >
        <div className="flex items-center justify-between mb-1 gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
              Available Balance
            </span>
            {isDepleted ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                Depleted
              </span>
            ) : isLowBalance ? (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 animate-pulse shrink-0">
                Low
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 shrink-0">
                Healthy
              </span>
            )}
          </div>
          <div
            className={`w-6 h-6 rounded-lg shrink-0 ${
              isDepleted
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : isLowBalance
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
            } flex items-center justify-center`}
          >
            {isLowBalance ? (
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Wallet className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        <div>
          <div
            className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
              isDepleted
                ? 'text-rose-600 dark:text-rose-400'
                : isLowBalance
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            {formatCurrency(realAvailableBalance)}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center justify-between gap-1">
            {isDepleted ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                Deficit • Needs funds
              </span>
            ) : isLowBalance ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold truncate">
                Below ₹{lowThreshold.toLocaleString('en-IN')} buffer
              </span>
            ) : (
              <span className="truncate">Running wallet balance</span>
            )}
            {onOpenSetBalance ? (
              <button
                type="button"
                onClick={onOpenSetBalance}
                className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline shrink-0 cursor-pointer ml-1"
              >
                Set Balance &rarr;
              </button>
            ) : isLowBalance ? (
              <Link
                href="/income"
                className="text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0 ml-1"
              >
                + Top-up &rarr;
              </Link>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
