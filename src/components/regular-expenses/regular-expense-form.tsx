'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import { RegularExpense, Category } from '@/types';
import { FrequencySelector } from './frequency-selector';
import { regularExpenseSchema } from '@/lib/validations/regular-expense';
import { getTodayDateString } from '@/lib/utils';
import { CATEGORY_ICON_MAP, AVAILABLE_ICONS } from '@/components/categories/category-icon';

interface RegularExpenseFormProps {
  isOpen: boolean;
  initialData?: RegularExpense | null;
  categories: Category[];
  userId: string;
  onClose: () => void;
  onSave: (expense: any) => Promise<void>;
}

export function RegularExpenseForm({
  isOpen,
  initialData,
  categories,
  userId,
  onClose,
  onSave,
}: RegularExpenseFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [icon, setIcon] = useState('Utensils');
  const [frequency, setFrequency] = useState<'daily' | 'interval_days' | 'weekly' | 'monthly'>('daily');
  const [intervalDays, setIntervalDays] = useState<number | null>(2);
  const [weeklyDay, setWeeklyDay] = useState<number | null>(1);
  const [monthlyDay, setMonthlyDay] = useState<number | null>(5);
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [hasDisplayTime, setHasDisplayTime] = useState(false);
  const [displayTime, setDisplayTime] = useState('');
  const [active, setActive] = useState(true);

  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setAmount(String(initialData.amount));
        setCategoryId(initialData.category_id || (categories[0]?.id ?? ''));
        setIcon(initialData.icon || 'Utensils');
        setFrequency(initialData.frequency);
        setIntervalDays(initialData.interval_days ?? 2);
        setWeeklyDay(initialData.weekly_day ?? 1);
        setMonthlyDay(initialData.monthly_day ?? 5);
        setStartDate(initialData.start_date);
        setEndDate(initialData.end_date || '');
        setHasEndDate(Boolean(initialData.end_date));
        setHasDisplayTime(Boolean(initialData.display_time));
        setDisplayTime(initialData.display_time ? initialData.display_time.slice(0, 5) : '');
        setActive(initialData.active);
      } else {
        setName('');
        setAmount('');
        setCategoryId(categories[0]?.id || '');
        setIcon('Utensils');
        setFrequency('daily');
        setIntervalDays(2);
        setWeeklyDay(1);
        setMonthlyDay(5);
        setStartDate(getTodayDateString());
        setEndDate('');
        setHasEndDate(false);
        setHasDisplayTime(false);
        setDisplayTime('');
        setActive(true);
      }
      setError(null);
      setIsIconPickerOpen(false);
    }
  }, [isOpen, initialData, categories]);

  if (!isOpen) return null;

  const SelectedIconComponent = CATEGORY_ICON_MAP[icon] || CATEGORY_ICON_MAP['Tag'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      user_id: userId,
      name: name.trim(),
      amount: parseFloat(amount),
      category_id: categoryId || null,
      icon,
      frequency,
      interval_days: frequency === 'interval_days' ? Number(intervalDays) : null,
      weekly_day: frequency === 'weekly' ? Number(weeklyDay) : null,
      monthly_day: frequency === 'monthly' ? Number(monthlyDay) : null,
      start_date: startDate,
      end_date: hasEndDate && endDate ? endDate : null,
      display_time: hasDisplayTime && displayTime.trim() ? displayTime.trim() : null,
      active,
      display_order: initialData?.display_order ?? 0,
    };

    const validation = regularExpenseSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Validation failed');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save regular expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col pb-safe"
      >
        {/* Mobile handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {initialData ? 'Edit Regular Expense' : 'Add Regular Expense'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Configure expense shortcut for quick additions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Icon Row */}
          <div className="flex items-end gap-2.5">
            {/* Icon Trigger */}
            <div className="relative">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 block">
                Icon
              </label>
              <button
                type="button"
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                className="w-11 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition-colors cursor-pointer"
              >
                <SelectedIconComponent className="w-5 h-5" />
              </button>

              {/* Icon Picker Popover */}
              {isIconPickerOpen && (
                <div className="absolute left-0 top-18 z-20 w-64 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_ICONS.slice(0, 30).map((iconKey) => {
                    const Comp = CATEGORY_ICON_MAP[iconKey];
                    if (!Comp) return null;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => {
                          setIcon(iconKey);
                          setIsIconPickerOpen(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition-colors cursor-pointer ${
                          icon === iconKey
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <Comp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Name Input */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="reg-name" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Expense Name *
              </label>
              <input
                id="reg-name"
                type="text"
                required
                placeholder="e.g. Breakfast, Metro, Gym"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-amount" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Default Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                  ₹
                </span>
                <input
                  id="reg-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-category" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Category
              </label>
              <select
                id="reg-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency Selector */}
          <FrequencySelector
            frequency={frequency}
            intervalDays={intervalDays}
            weeklyDay={weeklyDay}
            monthlyDay={monthlyDay}
            onChange={(updates) => {
              setFrequency(updates.frequency);
              if (updates.intervalDays !== undefined) setIntervalDays(updates.intervalDays);
              if (updates.weeklyDay !== undefined) setWeeklyDay(updates.weeklyDay);
              if (updates.monthlyDay !== undefined) setMonthlyDay(updates.monthlyDay);
            }}
          />

          {/* Start & End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-start-date" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Start Date *
              </label>
              <input
                id="reg-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="reg-end-date" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  End Date (Optional)
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => {
                      setHasEndDate(e.target.checked);
                      if (!e.target.checked) setEndDate('');
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Has End Date</span>
                </label>
              </div>

              {hasEndDate ? (
                <input
                  id="reg-end-date"
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
              ) : (
                <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400 italic">
                  No End Date (Continues indefinitely)
                </div>
              )}
            </div>
          </div>

          {/* Display on Dashboard After (Time) */}
          <div className="flex flex-col gap-2 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label htmlFor="reg-display-time" className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                    Display on Dashboard After (Time)
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    Only show on dashboard / checklist after this time on scheduled days
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDisplayTime}
                  onChange={(e) => {
                    setHasDisplayTime(e.target.checked);
                    if (!e.target.checked) setDisplayTime('');
                    else if (!displayTime) setDisplayTime('08:00');
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Set Time</span>
              </label>
            </div>

            {hasDisplayTime && (
              <div className="mt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 animate-in fade-in">
                <div className="relative flex-1">
                  <input
                    id="reg-display-time"
                    type="time"
                    value={displayTime}
                    onChange={(e) => setDisplayTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setDisplayTime('08:00')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      displayTime === '08:00'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Morning (08:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayTime('12:30')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      displayTime === '12:30'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Lunch (12:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayTime('19:30')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      displayTime === '19:30'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Dinner (19:30)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                Active Shortcut
              </span>
              <span className="text-[11px] text-zinc-400">
                Inactive expenses will not appear in the Quick Add checklist
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                active ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  active ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm shadow-emerald-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Shortcut'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
