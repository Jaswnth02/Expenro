'use client';

import React from 'react';
import {
  Utensils,
  Receipt,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { MonthlyMealSummary } from '@/types';
import { formatCurrency, getMonthName, cn } from '@/lib/utils';

interface MealDuesSummaryCardProps {
  summary: MonthlyMealSummary;
  onOpenSettleModal: () => void;
  selectedMonth: number;
  selectedYear: number;
}

export function MealDuesSummaryCard({
  summary,
  onOpenSettleModal,
  selectedMonth,
  selectedYear,
}: MealDuesSummaryCardProps) {
  const isSettled = summary.isSettled;
  const monthName = getMonthName(selectedMonth);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* 1. Main Outstanding Dues / Running Total Card */}
      <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 shadow-xl shadow-emerald-900/10">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 backdrop-blur-md">
                <Receipt className="w-3.5 h-3.5" />
                Monthly Food Postpaid
              </span>
              {isSettled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400 text-zinc-950">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Bill Settled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-zinc-950">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unpaid Dues
                </span>
              )}
            </div>
            
            <h2 className="text-sm font-medium text-emerald-100 mt-3">
              {monthName} {selectedYear} Food Total
            </h2>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3.5xl sm:text-4xl font-extrabold tracking-tight">
                {formatCurrency(summary.totalAmountSpent)}
              </span>
              {!isSettled && summary.totalUnpaidDues > 0 && (
                <span className="text-xs font-medium text-emerald-200">
                  (Dues to pay at once: {formatCurrency(summary.totalUnpaidDues)})
                </span>
              )}
            </div>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10">
            <Utensils className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Action Button & Settlement Details */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="text-xs text-emerald-100/90">
            {isSettled && summary.settlement ? (
              <span>
                Paid on {summary.settlement.payment_date} via{' '}
                <strong className="text-white">{summary.settlement.payment_method}</strong>
              </span>
            ) : (
              <span>Accumulate daily meals & pay the total bill together at month-end</span>
            )}
          </div>

          {!isSettled ? (
            <button
              onClick={onOpenSettleModal}
              disabled={summary.totalUnpaidDues === 0}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer',
                summary.totalUnpaidDues > 0
                  ? 'bg-white text-emerald-800 hover:bg-emerald-50 shadow-white/10'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay at Once ({formatCurrency(summary.totalUnpaidDues)})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/30 text-xs font-semibold text-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Recorded in Expenses</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Total Meals Taken */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Meals Taken</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
              {summary.totalMealsEaten} meals
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">Morning</span>
              <span className="text-base font-bold text-amber-900 dark:text-amber-200">{summary.breakfastCount}</span>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium block">Afternoon</span>
              <span className="text-base font-bold text-sky-900 dark:text-sky-200">{summary.lunchCount}</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">Night</span>
              <span className="text-base font-bold text-indigo-900 dark:text-indigo-200">{summary.dinnerCount}</span>
            </div>
          </div>
        </div>

        {summary.customCount > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Extra Items / Snacks:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{summary.customCount}</span>
          </div>
        )}
      </div>

      {/* 3. Meals Skipped & Savings */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Skipped / Absent</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold">
              {summary.totalMealsSkipped} skipped
            </span>
          </div>
          
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {summary.totalMealsSkipped}
              </span>
              <span className="text-xs text-zinc-500">meals saved</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Marking absent prevents accidental billing for meals you didn&apos;t eat.
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Avg Cost / Meal</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {summary.totalMealsEaten > 0
              ? formatCurrency(Math.round(summary.totalAmountSpent / summary.totalMealsEaten))
              : '₹0'}
          </span>
        </div>
      </div>
    </div>
  );
}
