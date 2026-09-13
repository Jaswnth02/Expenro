'use client';

import React, { useState } from 'react';
import {
  Coffee,
  Sun,
  Moon,
  Check,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { MealEntry, MealType, MealStatus } from '@/types';
import { formatCurrency, getTodayDateString, formatDate, cn } from '@/lib/utils';

interface QuickMealLoggerProps {
  date: string;
  onDateChange: (newDate: string) => void;
  dayEntries: MealEntry[];
  onAddMeal: (entry: {
    meal_type: MealType;
    name: string;
    amount: number;
    status: MealStatus;
    notes?: string;
  }) => Promise<void>;
  onUpdateMeal: (id: string, updates: { amount?: number; status?: MealStatus; notes?: string }) => Promise<void>;
  onDeleteMeal: (id: string) => Promise<void>;
}

const PRESET_MEALS: {
  type: MealType;
  title: string;
  timeHint: string;
  defaultPrice: number;
  icon: React.ElementType;
  accentColor: string;
  bgLight: string;
  borderLight: string;
}[] = [
  {
    type: 'breakfast',
    title: 'Morning / Breakfast',
    timeHint: '07:30 - 09:30',
    defaultPrice: 50,
    icon: Coffee,
    accentColor: 'text-amber-500',
    bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
    borderLight: 'border-amber-200/60 dark:border-amber-800/30',
  },
  {
    type: 'lunch',
    title: 'Afternoon / Lunch',
    timeHint: '12:30 - 14:30',
    defaultPrice: 80,
    icon: Sun,
    accentColor: 'text-sky-500',
    bgLight: 'bg-sky-50/50 dark:bg-sky-950/20',
    borderLight: 'border-sky-200/60 dark:border-sky-800/30',
  },
  {
    type: 'dinner',
    title: 'Night / Dinner',
    timeHint: '19:30 - 21:30',
    defaultPrice: 50,
    icon: Moon,
    accentColor: 'text-indigo-500',
    bgLight: 'bg-indigo-50/50 dark:bg-indigo-950/20',
    borderLight: 'border-indigo-200/60 dark:border-indigo-800/30',
  },
];

export function QuickMealLogger({
  date,
  onDateChange,
  dayEntries,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
}: QuickMealLoggerProps) {
  const isToday = date === getTodayDateString();

  // Editing amount state for existing meals
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmountVal, setEditAmountVal] = useState('');

  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleQuickLog = async (preset: (typeof PRESET_MEALS)[0], amount: number) => {
    try {
      setLoadingType(preset.type);
      await onAddMeal({
        meal_type: preset.type,
        name: preset.title.split('/')[0].trim(),
        amount,
        status: 'eaten',
        notes: undefined,
      });
    } finally {
      setLoadingType(null);
    }
  };

  const handleQuickSkip = async (preset: (typeof PRESET_MEALS)[0]) => {
    try {
      setLoadingType(`skip-${preset.type}`);
      await onAddMeal({
        meal_type: preset.type,
        name: preset.title.split('/')[0].trim(),
        amount: 0,
        status: 'skipped',
        notes: 'Marked skipped',
      });
    } finally {
      setLoadingType(null);
    }
  };

  const handleSaveEditAmount = async (id: string) => {
    const parsed = parseFloat(editAmountVal);
    if (isNaN(parsed) || parsed < 0) return;
    await onUpdateMeal(id, { amount: parsed, status: parsed === 0 ? 'skipped' : 'eaten' });
    setEditingId(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4 shadow-xs">
      {/* Header & Date Picker */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {isToday ? "Today's Meals" : 'Log Meals'}
          </h3>
          {isToday && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
              Today
            </span>
          )}
        </div>

        {/* Date Selector */}
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shrink-0 cursor-pointer"
        />
      </div>

      {/* Preset Sessions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PRESET_MEALS.map((preset) => {
          const Icon = preset.icon;
          const entry = dayEntries.find((e) => e.meal_type === preset.type);
          const isLogged = Boolean(entry);
          const isEaten = entry?.status === 'eaten';
          const isSkipped = entry?.status === 'skipped';

          return (
            <div
              key={preset.type}
              className={cn(
                'rounded-xl border p-2 sm:p-2.5 transition-all flex flex-col justify-between gap-1.5',
                isLogged
                  ? isEaten
                    ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
                  : `${preset.borderLight} ${preset.bgLight}`
              )}
            >
              {/* Row 1: Session Icon + Name + Cost & Edit */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                      isLogged && isEaten
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : `${preset.accentColor} bg-white dark:bg-zinc-800 shadow-2xs`
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                      {preset.title.split('/')[0].trim()}
                    </span>
                  </div>
                </div>

                {/* Price display / Editing */}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === entry?.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-zinc-400">₹</span>
                      <input
                        type="number"
                        value={editAmountVal}
                        onChange={(e) => setEditAmountVal(e.target.value)}
                        className="w-12 px-1 py-0.5 rounded border border-emerald-500 text-xs font-bold bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditAmount(entry!.id)}
                        className="p-0.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-0.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'text-xs font-extrabold',
                          isLogged && isSkipped
                            ? 'line-through text-zinc-400'
                            : 'text-zinc-900 dark:text-zinc-100'
                        )}
                      >
                        {formatCurrency(isLogged ? entry!.amount : preset.defaultPrice)}
                      </span>
                      {isLogged && (
                        <button
                          onClick={() => {
                            setEditingId(entry!.id);
                            setEditAmountVal(String(entry!.amount));
                          }}
                          className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                          title="Edit price"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: One-tap Action Buttons */}
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                {!isLogged ? (
                  <>
                    <button
                      type="button"
                      disabled={loadingType === preset.type}
                      onClick={() => handleQuickLog(preset, preset.defaultPrice)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Log ₹{preset.defaultPrice}</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingType === `skip-${preset.type}`}
                      onClick={() => handleQuickSkip(preset)}
                      className="py-1 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium transition-all cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded',
                          isEaten
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                        )}
                      >
                        {isEaten ? '✓ Eaten' : '✕ Skipped'}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateMeal(entry!.id, {
                            status: isEaten ? 'skipped' : 'eaten',
                            amount: isEaten ? 0 : preset.defaultPrice,
                          })
                        }
                        className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
                      >
                        {isEaten ? 'Skip' : 'Eat'}
                      </button>
                    </div>
                    <button
                      onClick={() => onDeleteMeal(entry!.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom items recorded today (e.g., snacks, extra sweet, cold drink) */}
      {dayEntries.filter((e) => e.meal_type === 'custom').length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Extras & Custom Food Logged for {formatDate(date)}
          </h4>
          <div className="flex flex-wrap gap-2">
            {dayEntries
              .filter((e) => e.meal_type === 'custom')
              .map((custom) => (
                <div
                  key={custom.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-xs"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {custom.name}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatCurrency(custom.amount)}
                  </span>
                  <button
                    onClick={() => onDeleteMeal(custom.id)}
                    className="text-zinc-400 hover:text-rose-500 ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
