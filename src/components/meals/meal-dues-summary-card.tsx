'use client';

import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { MonthlyMealSummary } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface MealDuesSummaryCardProps {
  summary: MonthlyMealSummary;
  onOpenSettleModal: () => void;
  selectedMonth: number;
  selectedYear: number;
}

export function MealDuesSummaryCard({
  summary,
  onOpenSettleModal,
}: MealDuesSummaryCardProps) {
  const isSettled = summary.isSettled;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* 1. Main Outstanding Dues / Running Total Card */}
      <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 shadow-xl shadow-emerald-900/10 flex items-center justify-between gap-4">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <span className="text-xs font-medium text-emerald-100/90 block">
            Total
          </span>
          <span className="text-3xl sm:text-3.5xl font-extrabold tracking-tight">
            {formatCurrency(summary.totalAmountSpent)}
          </span>
        </div>

        <div className="relative z-10 shrink-0">
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
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/30 text-xs font-semibold text-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Recorded in Expenses</span>
              </div>
              {summary.settlement && (
                <p className="text-[11px] text-emerald-200/80 mt-1">
                  Paid on {summary.settlement.payment_date}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Total Meals Taken */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Meals Taken</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
              {summary.totalMealsEaten} meals
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-2 text-center">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">Morning</span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{summary.breakfastCount}</span>
            </div>
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/30 rounded-xl p-2 text-center">
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium block">Afternoon</span>
              <span className="text-sm font-bold text-sky-900 dark:text-sky-200">{summary.lunchCount}</span>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl p-2 text-center">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">Night</span>
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{summary.dinnerCount}</span>
            </div>
          </div>
        </div>

        {summary.customCount > 0 && (
          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
            <span>Extra Items / Snacks:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{summary.customCount}</span>
          </div>
        )}
      </div>

      {/* 3. Average & Attendance */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">Average Rate</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">
              {summary.totalMealsEaten} meals taken
            </span>
          </div>
          
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {summary.totalMealsEaten > 0
                  ? formatCurrency(Math.round(summary.totalAmountSpent / summary.totalMealsEaten))
                  : '₹50'}
              </span>
              <span className="text-xs text-zinc-500">per meal avg</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Total Month Dues</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalAmountSpent)}
          </span>
        </div>
      </div>
    </div>
  );
}
