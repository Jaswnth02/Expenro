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
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-3.5 shadow-xs transition-all hover:border-emerald-500/40">
      {/* Header Row: Icon + Title on left, Tracker Link on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Utensils className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Mess / Food Dues
            </h3>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
              Monthly
            </span>
          </div>
        </div>

        <Link
          href="/meals"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
        >
          <span>Open Tracker</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content Row: Left side Dues & meals count, Right side Today's Meal Status */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
        {/* Left: Current Unpaid Dues */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100 shrink-0">
            {formatCurrency(summary.isSettled ? summary.totalAmountSpent : summary.totalUnpaidDues)}
          </span>
          <span className="text-[10px] text-zinc-400 truncate">
            ({summary.totalMealsEaten} meals)
          </span>
        </div>

        {/* Right: Today's Status Badges */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors',
              hasBreakfast
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50/60 dark:bg-zinc-800/40'
            )}
            title="Breakfast"
          >
            <Coffee className="w-2.5 h-2.5" />
            <span>Morning{hasBreakfast ? ' ✓' : ''}</span>
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors',
              hasLunch
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50/60 dark:bg-zinc-800/40'
            )}
            title="Lunch"
          >
            <Sun className="w-2.5 h-2.5" />
            <span>Lunch{hasLunch ? ' ✓' : ''}</span>
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors',
              hasDinner
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 bg-zinc-50/60 dark:bg-zinc-800/40'
            )}
            title="Dinner"
          >
            <Moon className="w-2.5 h-2.5" />
            <span>Night{hasDinner ? ' ✓' : ''}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
