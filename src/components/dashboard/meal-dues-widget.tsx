'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Utensils,
  ArrowRight,
  Coffee,
  Sun,
  Moon,
} from 'lucide-react';
import { MonthlyMealSummary } from '@/types';
import { FinanceService } from '@/lib/mongodb/data-service';
import { formatCurrency, getTodayDateString, getMonthName } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MealDuesWidgetProps {
  refreshKey?: number;
}

export function MealDuesWidget({ refreshKey = 0 }: MealDuesWidgetProps) {
  const [summary, setSummary] = useState<MonthlyMealSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const today = getTodayDateString();
  const [yearStr, monthStr] = today.split('-');
  const currentMonth = Number(monthStr);
  const currentYear = Number(yearStr);

  useEffect(() => {
    let isMounted = true;
    FinanceService.getMonthlyMealSummary(currentMonth, currentYear).then((res) => {
      if (isMounted) {
        setSummary(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentMonth, currentYear, refreshKey]);

  if (loading || !summary) {
    return null;
  }

  const todayEntries = summary.entries.filter((e) => e.date === today);
  const hasBreakfast = todayEntries.some((e) => e.meal_type === 'breakfast' && e.status === 'eaten');
  const hasLunch = todayEntries.some((e) => e.meal_type === 'lunch' && e.status === 'eaten');
  const hasDinner = todayEntries.some((e) => e.meal_type === 'dinner' && e.status === 'eaten');

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-all hover:border-emerald-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Monthly Mess / Food Dues
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Pay at Once
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {getMonthName(currentMonth)} {currentYear} accrued meals bill
            </p>
          </div>
        </div>

        <Link
          href="/meals"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>Open Tracker</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {/* Running Dues */}
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {summary.isSettled ? 'Settled Bill' : 'Current Unpaid Dues'}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(summary.isSettled ? summary.totalAmountSpent : summary.totalUnpaidDues)}
            </span>
            <span className="text-xs text-zinc-400">
              ({summary.totalMealsEaten} meals taken)
            </span>
          </div>
        </div>

        {/* Today's Quick Meal Status */}
        <div>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
            Today&apos;s Status
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                hasBreakfast
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40'
              )}
            >
              <Coffee className="w-3 h-3" />
              <span>Morning {hasBreakfast ? '✓' : ''}</span>
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                hasLunch
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40'
              )}
            >
              <Sun className="w-3 h-3" />
              <span>Lunch {hasLunch ? '✓' : ''}</span>
            </span>

            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border',
                hasDinner
                  ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40'
              )}
            >
              <Moon className="w-3 h-3" />
              <span>Night {hasDinner ? '✓' : ''}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
