'use client';

import React, { useState, useMemo } from 'react';
import {
  Coffee,
  Sun,
  Moon,
  Plus,
  X,
} from 'lucide-react';
import { MealEntry, MealType } from '@/types';
import { formatCurrency, formatDate, getMonthName, cn } from '@/lib/utils';

interface MonthlyMealCalendarProps {
  entries: MealEntry[];
  selectedMonth: number;
  selectedYear: number;
  onSelectDateToLog: (date: string) => void;
  onDeleteMeal: (id: string) => Promise<void>;
  onToggleStatus?: (id: string, currentStatus: 'eaten' | 'skipped', defaultAmount: number) => Promise<void>;
}

interface DaySummary {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: string;
  entries: MealEntry[];
  totalAmount: number;
  eatenCount: number;
  skippedCount: number;
}

const TYPE_ICONS: Record<MealType, React.ElementType> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  custom: Plus,
};

const TYPE_COLORS: Record<MealType, string> = {
  breakfast: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
  lunch: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40',
  dinner: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
  custom: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
};

export function MonthlyMealCalendar({
  entries,
  selectedMonth,
  selectedYear,
  onSelectDateToLog,
  onDeleteMeal,
}: MonthlyMealCalendarProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'eaten' | 'skipped'>('all');

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthStr = String(selectedMonth).padStart(2, '0');

    // Group entries by date
    const entryMap = new Map<string, MealEntry[]>();
    for (const e of entries) {
      const existing = entryMap.get(e.date) || [];
      existing.push(e);
      entryMap.set(e.date, existing);
    }

    const days: DaySummary[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;
      const d = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayEntries = entryMap.get(dateStr) || [];

      const eatenEntries = dayEntries.filter((e) => e.status === 'eaten');
      const totalAmount = eatenEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      days.push({
        dateStr,
        dayNumber: day,
        dayOfWeek,
        entries: dayEntries,
        totalAmount,
        eatenCount: eatenEntries.length,
        skippedCount: dayEntries.filter((e) => e.status === 'skipped').length,
      });
    }

    return days;
  }, [entries, selectedMonth, selectedYear]);

  // Filtered days based on user selection
  const filteredDays = useMemo(() => {
    if (filterMode === 'eaten') {
      return daysInMonth.filter((d) => d.eatenCount > 0);
    }
    if (filterMode === 'skipped') {
      return daysInMonth.filter((d) => d.skippedCount > 0);
    }
    return daysInMonth;
  }, [daysInMonth, filterMode]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Table Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Daily Food Log & History ({getMonthName(selectedMonth)} {selectedYear})
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Individual meal records and daily subtotals
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
              filterMode === 'all'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            All Days ({daysInMonth.length})
          </button>
          <button
            onClick={() => setFilterMode('eaten')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
              filterMode === 'eaten'
                ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            Meals Taken ({daysInMonth.filter((d) => d.eatenCount > 0).length})
          </button>
          <button
            onClick={() => setFilterMode('skipped')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
              filterMode === 'skipped'
                ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            Skipped ({daysInMonth.filter((d) => d.skippedCount > 0).length})
          </button>
        </div>
      </div>

      {/* Days Feed: Individual card box for each day */}
      <div className="flex flex-col gap-2.5">
        {filteredDays.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            No entries match the selected filter.
          </div>
        ) : (
          filteredDays.map((day) => {
            const hasEntries = day.entries.length > 0;

            return (
              <div
                key={day.dateStr}
                className={cn(
                  'rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-3.5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  hasEntries
                    ? 'hover:border-zinc-300 dark:hover:border-zinc-700'
                    : 'opacity-60 hover:opacity-100'
                )}
              >
                {/* Date & Day Indicator */}
                <div className="flex items-center gap-3 sm:w-44 shrink-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 border text-xs',
                      day.eatenCount > 0
                        ? 'border-emerald-500/20 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : day.skippedCount > 0
                        ? 'border-amber-500/20 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    )}
                  >
                    <span className="text-[9px] uppercase tracking-wider leading-none">
                      {day.dayOfWeek}
                    </span>
                    <span className="text-sm font-extrabold leading-tight mt-0.5">
                      {day.dayNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      {formatDate(day.dateStr)}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {day.entries.length === 0
                        ? 'No meals logged'
                        : day.eatenCount > 0 && day.skippedCount > 0
                        ? `${day.eatenCount} eaten, ${day.skippedCount} skipped`
                        : day.eatenCount > 0
                        ? `${day.eatenCount} ${day.eatenCount === 1 ? 'meal' : 'meals'}`
                        : `${day.skippedCount} skipped`}
                    </span>
                  </div>
                </div>

                {/* Meals Taken & Skipped Chips */}
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {hasEntries ? (
                    day.entries.map((meal) => {
                      const Icon = TYPE_ICONS[meal.meal_type] || Coffee;
                      const isEaten = meal.status === 'eaten';
                      const badgeStyle = TYPE_COLORS[meal.meal_type] || TYPE_COLORS.custom;

                      return (
                        <div
                          key={meal.id}
                          className={cn(
                            'group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition-all',
                            isEaten
                              ? badgeStyle
                              : 'bg-zinc-100/90 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400'
                          )}
                        >
                          <Icon className={cn('w-3.5 h-3.5 shrink-0', isEaten ? '' : 'text-zinc-400')} />
                          <span className={cn('font-semibold', isEaten ? '' : 'text-zinc-700 dark:text-zinc-300')}>
                            {meal.name}
                          </span>
                          {isEaten ? (
                            <span className="font-bold ml-1">
                              {formatCurrency(meal.amount)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 ml-1">
                              Skipped
                            </span>
                          )}

                          {/* Quick delete button on hover */}
                          <button
                            onClick={() => onDeleteMeal(meal.id)}
                            className="opacity-0 group-hover:opacity-100 ml-1 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer"
                            title="Delete meal entry"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => onSelectDateToLog(day.dateStr)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Log meals for this date</span>
                    </button>
                  )}
                </div>

                {/* Day Total & Quick Log action */}
                <div className="sm:text-right shrink-0 flex items-center sm:flex-col justify-between gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-400 sm:hidden">Day Total:</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      day.totalAmount > 0
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-400'
                    )}
                  >
                    {formatCurrency(day.totalAmount)}
                  </span>
                  <button
                    onClick={() => onSelectDateToLog(day.dateStr)}
                    className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Add / Edit
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
