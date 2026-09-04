'use client';

import React from 'react';
import { RegularFrequency } from '@/types';
import { WEEKDAYS } from '@/lib/calculations/regular-expenses';
import { Calendar, Repeat, CalendarDays, Clock } from 'lucide-react';

interface FrequencySelectorProps {
  frequency: RegularFrequency;
  intervalDays?: number | null;
  weeklyDay?: number | null;
  monthlyDay?: number | null;
  onChange: (updates: {
    frequency: RegularFrequency;
    intervalDays?: number | null;
    weeklyDay?: number | null;
    monthlyDay?: number | null;
  }) => void;
}

export function FrequencySelector({
  frequency,
  intervalDays = 2,
  weeklyDay = 1,
  monthlyDay = 5,
  onChange,
}: FrequencySelectorProps) {
  const options: { id: RegularFrequency; label: string; icon: React.ReactNode }[] = [
    { id: 'daily', label: 'Daily', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'interval_days', label: 'Every X Days', icon: <Repeat className="w-3.5 h-3.5" /> },
    { id: 'weekly', label: 'Weekly', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'monthly', label: 'Monthly', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        Frequency *
      </label>

      {/* Frequency Type Pill Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-950/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        {options.map((opt) => {
          const isSelected = frequency === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange({
                  frequency: opt.id,
                  intervalDays: opt.id === 'interval_days' ? (intervalDays || 2) : null,
                  weeklyDay: opt.id === 'weekly' ? (weeklyDay ?? 1) : null,
                  monthlyDay: opt.id === 'monthly' ? (monthlyDay || 5) : null,
                });
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-zinc-200/60 dark:ring-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-Configuration Fields */}
      {frequency === 'interval_days' && (
        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-in fade-in duration-150">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Repeat every
          </span>
          <div className="relative w-20">
            <input
              type="number"
              min="1"
              max="365"
              value={intervalDays || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChange({
                  frequency: 'interval_days',
                  intervalDays: isNaN(val) ? 1 : Math.max(1, val),
                });
              }}
              className="w-full text-center font-bold px-2 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Days
          </span>
        </div>
      )}

      {frequency === 'weekly' && (
        <div className="flex flex-col gap-1.5 p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-in fade-in duration-150">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Every week on:
          </span>
          <select
            value={weeklyDay ?? 1}
            onChange={(e) => {
              onChange({
                frequency: 'weekly',
                weeklyDay: parseInt(e.target.value, 10),
              });
            }}
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {frequency === 'monthly' && (
        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl animate-in fade-in duration-150">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Every month on day:
          </span>
          <select
            value={monthlyDay || 1}
            onChange={(e) => {
              onChange({
                frequency: 'monthly',
                monthlyDay: parseInt(e.target.value, 10),
              });
            }}
            className="w-24 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
                {d === 1 || d === 21 || d === 31
                  ? 'st'
                  : d === 2 || d === 22
                  ? 'nd'
                  : d === 3 || d === 23
                  ? 'rd'
                  : 'th'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
