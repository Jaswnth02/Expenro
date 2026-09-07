'use client';

import React, { useState } from 'react';
import {
  Coffee,
  Sun,
  Moon,
  Plus,
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
  onUpdateMeal: (id: string, updates: Partial<MealEntry>) => Promise<void>;
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
    timeHint: '08:00 - 10:00',
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

  // Custom meal modal / inline drawer state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customNotes, setCustomNotes] = useState('');

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

  const handleSaveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customAmount);
    if (!customName.trim() || isNaN(parsed) || parsed <= 0) return;

    try {
      setLoadingType('custom');
      await onAddMeal({
        meal_type: 'custom',
        name: customName.trim(),
        amount: parsed,
        status: 'eaten',
        notes: customNotes.trim() || undefined,
      });
      setCustomName('');
      setCustomAmount('');
      setCustomNotes('');
      setIsAddingCustom(false);
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
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
      {/* Header & Date Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {isToday ? "Today's Meal Logger" : 'Log Meals for Date'}
            </h3>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            1-tap record eaten meals with prices or mark skipped
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Preset Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
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
                'rounded-xl border p-4 transition-all flex flex-col justify-between',
                isLogged
                  ? isEaten
                    ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 opacity-75'
                  : `${preset.borderLight} ${preset.bgLight}`
              )}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isLogged && isEaten
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : `${preset.accentColor} bg-white dark:bg-zinc-800 shadow-xs`
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {preset.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {preset.timeHint}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isLogged && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        isEaten
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      )}
                    >
                      {isEaten ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {isEaten ? 'Eaten' : 'Skipped'}
                    </span>
                  )}
                </div>

                {/* Amount / Price display */}
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Cost:</span>
                  {editingId === entry?.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-400">₹</span>
                      <input
                        type="number"
                        value={editAmountVal}
                        onChange={(e) => setEditAmountVal(e.target.value)}
                        className="w-16 px-1.5 py-0.5 rounded border border-emerald-500 text-xs font-bold text-zinc-900 dark:text-zinc-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditAmount(entry!.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-base font-bold',
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
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          title="Edit amount"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                {!isLogged ? (
                  <>
                    <button
                      type="button"
                      disabled={loadingType === preset.type}
                      onClick={() => handleQuickLog(preset, preset.defaultPrice)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Log Eaten</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingType === `skip-${preset.type}`}
                      onClick={() => handleQuickSkip(preset)}
                      className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between text-xs">
                    <button
                      onClick={() =>
                        onUpdateMeal(entry!.id, {
                          status: isEaten ? 'skipped' : 'eaten',
                          amount: isEaten ? 0 : preset.defaultPrice,
                        })
                      }
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium underline underline-offset-2 cursor-pointer"
                    >
                      {isEaten ? 'Change to Skipped' : 'Change to Eaten'}
                    </button>
                    <button
                      onClick={() => onDeleteMeal(entry!.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Custom / Extra Snack button & form */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
        {!isAddingCustom ? (
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Extra Food / Snack Item</span>
          </button>
        ) : (
          <form
            onSubmit={handleSaveCustom}
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              placeholder="Item name (e.g. Special Sweet, Milk, Extra Rice)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <div className="relative w-24">
              <span className="absolute left-2 top-1.5 text-xs text-zinc-400">₹</span>
              <input
                type="number"
                placeholder="Amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full pl-5 pr-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loadingType === 'custom'}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold cursor-pointer"
            >
              Add Extra
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCustom(false)}
              className="px-2 py-1.5 text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
