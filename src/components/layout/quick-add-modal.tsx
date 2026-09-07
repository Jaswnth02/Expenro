'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, CheckCircle2, AlertCircle, PlusCircle, ArrowDownRight, ArrowUpRight, Plus, Check } from 'lucide-react';
import { FinanceService } from '@/lib/mongodb/data-service';
import { useAuth } from '@/context/auth-context';
import { getTodayDateString } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import { PRESET_COLORS } from '@/components/categories/category-icon';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
  initialMode?: 'regular' | 'manual';
}

const COMMON_INCOME_SOURCES = [
  'Pocket Money',
  'Salary',
  'Internship',
  'Freelancing',
  'Scholarship',
  'Gift / Family',
  'Other',
];

export function QuickAddModal({
  isOpen,
  onClose,
  onExpenseAdded,
}: QuickAddModalProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [entryDate, setEntryDate] = useState(getTodayDateString());
  const [incomeSource, setIncomeSource] = useState('Pocket Money');
  const [notes, setNotes] = useState('');

  // Quick category creation state
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10B981');

  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; color?: string }[]>([]);

  const refreshCategories = async (autoSelectId?: string) => {
    const cats = (await FinanceService.getCategories()).filter((c) => c.type === 'expense');
    setCategories(cats);
    if (autoSelectId) {
      setCategoryId(autoSelectId);
    } else if (cats.length > 0 && (!categoryId || !cats.some((c) => c.id === categoryId))) {
      setCategoryId(cats[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const today = getTodayDateString();
      refreshCategories();
      setEntryDate(today);
      setError(null);
      setIsCreatingCat(false);
      setNewCatName('');

      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  const handleCreateQuickCategory = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    const created = await FinanceService.addCategory({
      user_id: user?.id || null,
      name: clean,
      type: 'expense',
      color: newCatColor,
      icon: 'Tag',
    });

    await refreshCategories(created.id);
    setNewCatName('');
    setIsCreatingCat(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      amountInputRef.current?.focus();
      return;
    }

    if (entryType === 'expense') {
      if (!categoryId) {
        setError('Please select an expense category');
        return;
      }

      const selectedCat = categories.find((c) => c.id === categoryId);
      const finalDescription = description.trim() || selectedCat?.name || 'Expense';

      try {
        await FinanceService.addExpense({
          user_id: user?.id || 'user-default-1',
          category_id: categoryId,
          amount: numAmount,
          description: finalDescription,
          payment_method: paymentMethod,
          expense_date: entryDate,
          notes: notes.trim() || null,
          receipt_url: null,
        });

        setToastMessage('Expense added successfully.');
        setTimeout(() => {
          setToastMessage(null);
          setAmount('');
          setDescription('');
          setNotes('');
          onClose();
          if (onExpenseAdded) onExpenseAdded();
        }, 500);
      } catch {
        setError('Something went wrong while saving your expense.');
      }
    } else {
      // Adding Income
      const finalSource = incomeSource.trim() || 'Pocket Money';
      const finalDescription = description.trim() || finalSource;

      try {
        await FinanceService.addIncome({
          user_id: user?.id || 'user-default-1',
          source: finalSource,
          amount: numAmount,
          description: finalDescription,
          income_date: entryDate,
          notes: notes.trim() || null,
        });

        setToastMessage('Income added successfully!');
        setTimeout(() => {
          setToastMessage(null);
          setAmount('');
          setDescription('');
          setNotes('');
          onClose();
          if (onExpenseAdded) onExpenseAdded();
        }, 500);
      } catch {
        setError('Something went wrong while saving your income.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] flex flex-col pb-safe"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header & Segmented Switch */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          {/* Segmented Control */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setEntryType('expense');
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                entryType === 'expense'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType('income');
                setError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                entryType === 'income'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {toastMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Amount Field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="quick-add-amount" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold ${
                entryType === 'income' ? 'text-emerald-500' : 'text-zinc-400'
              }`}>
                ₹
              </span>
              <input
                ref={amountInputRef}
                id="quick-add-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border rounded-xl text-base font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none transition-all placeholder:text-zinc-400 ${
                  entryType === 'income'
                    ? 'border-emerald-500/40 focus:ring-2 focus:ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-rose-500'
                }`}
              />
            </div>
          </div>

          {/* Conditional Category (Expense) or Source (Income) */}
          {entryType === 'expense' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor="expense-category" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Category *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCat(!isCreatingCat)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{isCreatingCat ? 'Close' : 'New'}</span>
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <Link
                    href="/categories"
                    onClick={onClose}
                    className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </div>
              <select
                id="expense-category"
                value={categoryId}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsCreatingCat(true);
                  } else {
                    setCategoryId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__add_new__">+ Add New Category...</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="income-source" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Income Source *
              </label>
              {/* Quick source pills */}
              <div className="flex flex-wrap gap-1">
                {COMMON_INCOME_SOURCES.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setIncomeSource(src)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      incomeSource === src
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
              <input
                id="income-source"
                type="text"
                placeholder="Or type source (e.g. Dad, Freelance client)"
                value={incomeSource}
                onChange={(e) => setIncomeSource(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Quick Inline Category Creator */}
          {entryType === 'expense' && isCreatingCat && (
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-emerald-500/40 rounded-xl flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Quick Add Category
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingCat(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New Category Name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateQuickCategory();
                    }
                  }}
                  autoFocus
                  className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCreateQuickCategory}
                  disabled={!newCatName.trim()}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-zinc-400 font-medium mr-1">Color:</span>
                {PRESET_COLORS.slice(0, 7).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className="w-4 h-4 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: color }}
                  >
                    {newCatColor === color && (
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date & Payment Method Side-by-Side Grid */}
          <div className={`grid ${entryType === 'expense' ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 sm:gap-3`}>
            {/* Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="entry-date" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Date *
              </label>
              <input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full px-2.5 sm:px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Payment Method (Expense only) */}
            {entryType === 'expense' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="expense-payment" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Payment Method
                </label>
                <select
                  id="expense-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-2.5 sm:px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Description (Optional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="entry-desc" className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Description (Optional)
            </label>
            <input
              id="entry-desc"
              type="text"
              placeholder={entryType === 'expense' ? 'e.g. Lunch with team, Metro reload' : 'e.g. Monthly allowance, Project payment'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                entryType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-emerald-600/20 focus:ring-emerald-500'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 shadow-zinc-900/20 focus:ring-zinc-900'
              }`}
            >
              {entryType === 'income' ? 'Save Income' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
