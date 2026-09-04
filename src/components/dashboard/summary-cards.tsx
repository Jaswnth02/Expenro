'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowDownRight, Wallet, ChevronDown } from 'lucide-react';
import { FinancialSummary, Expense, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/categories/category-icon';
import { useExcludedCategories } from '@/lib/exclusions';

interface SummaryCardsProps {
  summary: FinancialSummary;
  expenses?: Expense[];
  categories?: Category[];
  selectedMonth?: number;
  selectedYear?: number;
}

export function SummaryCards({
  summary,
  expenses = [],
  categories = [],
  selectedMonth,
  selectedYear,
}: SummaryCardsProps) {
  const activeMonth = selectedMonth ?? summary.month ?? 9;
  const activeYear = selectedYear ?? summary.year ?? 2026;

  // Extract active expense categories
  const expenseCategories = useMemo(() => {
    const list = categories.filter((c) => c.type === 'expense');
    const existingNames = new Set(list.map((c) => c.name.toLowerCase()));

    // Include any categories present in current month's expenses as well
    expenses.forEach((e) => {
      const catName = e.category?.name || 'Other';
      if (!existingNames.has(catName.toLowerCase())) {
        existingNames.add(catName.toLowerCase());
        list.push({
          id: e.category_id || `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`,
          user_id: null,
          name: catName,
          type: 'expense',
          color: e.category?.color || '#6B7280',
          icon: e.category?.icon || 'Tag',
          created_at: new Date().toISOString(),
        });
      }
    });

    if (list.length === 0) {
      list.push(
        { id: 'cat-food', user_id: null, name: 'Food', type: 'expense', color: '#F59E0B', icon: 'Utensils', created_at: '' },
        { id: 'cat-mess-food', user_id: null, name: 'Mess Food', type: 'expense', color: '#EA580C', icon: 'Utensils', created_at: '' },
        { id: 'cat-tea-snacks', user_id: null, name: 'Tea & Snacks', type: 'expense', color: '#F59E0B', icon: 'Coffee', created_at: '' },
        { id: 'cat-stationary', user_id: null, name: 'Stationary', type: 'expense', color: '#8B5CF6', icon: 'BookOpen', created_at: '' },
        { id: 'cat-grocery', user_id: null, name: 'Grocery', type: 'expense', color: '#10B981', icon: 'ShoppingBag', created_at: '' },
        { id: 'cat-travel', user_id: null, name: 'Travel', type: 'expense', color: '#F97316', icon: 'Plane', created_at: '' },
      );
    }

    return list;
  }, [categories, expenses]);

  // Selected category state with localStorage persistence
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Mess Food');

  // Month-scoped categories excluded from Total Expenses calculation
  const { excludedCategories, isExcluded, toggleExclusion } = useExcludedCategories(activeMonth, activeYear);

  // Load persisted selected category preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCat = localStorage.getItem('expenro_summary_selected_category');
        if (savedCat && expenseCategories.some((c) => c.name.toLowerCase() === savedCat.toLowerCase())) {
          setSelectedCategoryName(savedCat);
        } else if (expenseCategories.length > 0) {
          const mess = expenseCategories.find((c) => c.name.toLowerCase() === 'mess food');
          setSelectedCategoryName(mess ? mess.name : expenseCategories[0].name);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, [expenseCategories]);

  const handleCategoryChange = (name: string) => {
    setSelectedCategoryName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('expenro_summary_selected_category', name);
    }
  };

  // Check if currently selected category is included in Total Expenses
  const isIncludedInTotal = !isExcluded(selectedCategoryName);

  // Toggle category inclusion in Total Expenses
  const toggleIncludeCategory = (name: string) => {
    toggleExclusion(name);
  };

  // Find active category object
  const activeCategory = useMemo(() => {
    return (
      expenseCategories.find(
        (c) => c.name.toLowerCase() === selectedCategoryName.toLowerCase()
      ) || {
        id: 'cat-default',
        name: selectedCategoryName,
        type: 'expense' as const,
        color: '#EA580C',
        icon: 'Utensils',
        created_at: '',
      }
    );
  }, [expenseCategories, selectedCategoryName]);

  // Calculate expenses for the selected category in this month
  const { categoryTotal, transactionCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    const target = selectedCategoryName.trim().toLowerCase();

    expenses.forEach((e) => {
      const catName = (e.category?.name || '').trim().toLowerCase();
      if (catName === target) {
        total += Number(e.amount || 0);
        count += 1;
      }
    });

    return { categoryTotal: total, transactionCount: count };
  }, [expenses, selectedCategoryName]);

  // Calculate sum of all excluded categories for the month
  const { excludedSum, excludedNames } = useMemo(() => {
    if (excludedCategories.length === 0) return { excludedSum: 0, excludedNames: [] };
    const excludedSet = new Set(excludedCategories.map((c) => c.toLowerCase()));
    let sum = 0;
    const namesSet = new Set<string>();

    expenses.forEach((e) => {
      const catName = (e.category?.name || 'Other').trim();
      if (excludedSet.has(catName.toLowerCase())) {
        sum += Number(e.amount || 0);
        namesSet.add(catName);
      }
    });

    return { excludedSum: sum, excludedNames: Array.from(namesSet) };
  }, [expenses, excludedCategories]);

  // Adjusted total expenses & remaining balance
  const displayedTotalExpenses = Math.max(0, summary.totalExpenses - excludedSum);
  const displayedRemainingBalance = summary.totalIncome - displayedTotalExpenses;

  const percentOfTotal =
    displayedTotalExpenses > 0
      ? Math.round((categoryTotal / displayedTotalExpenses) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
      {/* Card 1: Total Expenses */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            Total Expenses
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(displayedTotalExpenses)}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
            {excludedSum > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Excl. {excludedNames.join(', ')}
              </span>
            ) : (
              'Spent this month'
            )}
          </p>
        </div>
      </div>

      {/* Card 2: Remaining Balance */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate">
            Remaining Balance
          </span>
          <div
            className={`w-6 h-6 rounded-lg shrink-0 ${
              displayedRemainingBalance >= 0
                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
            } flex items-center justify-center`}
          >
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(displayedRemainingBalance)}
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
            Budget remainder
          </p>
        </div>
      </div>

      {/* Card 3: Selected Category Expenses */}
      <div className="col-span-2 md:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1 gap-1.5">
          <div className="relative inline-flex items-center min-w-0">
            <select
              id="summary-category-selector"
              value={selectedCategoryName}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 transition-colors rounded-lg pl-2 pr-5 py-0.5 border border-zinc-200/80 dark:border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none truncate max-w-[140px] sm:max-w-[155px]"
            >
              {expenseCategories.map((c) => (
                <option
                  key={c.name}
                  value={c.name}
                  className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                >
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-zinc-500 dark:text-zinc-400 pointer-events-none absolute right-1.5" />
          </div>

          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: `${activeCategory?.color || '#EA580C'}1A`,
              color: activeCategory?.color || '#EA580C',
            }}
          >
            <CategoryIcon
              iconName={activeCategory?.icon || 'Utensils'}
              className="w-3.5 h-3.5"
            />
          </div>
        </div>

        <div>
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(categoryTotal)}
          </div>
          
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
              {transactionCount === 1
                ? '1 txn'
                : `${transactionCount} txns`}
              {isIncludedInTotal
                ? (displayedTotalExpenses > 0 ? ` (${percentOfTotal}%)` : '')
                : ' • Excluded'}
            </span>

            {/* Interactive ON / OFF toggle control */}
            <div className="flex items-center gap-1.5 select-none shrink-0">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                In Total
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isIncludedInTotal}
                id="toggle-include-category-btn"
                onClick={() => toggleIncludeCategory(selectedCategoryName)}
                title={
                  isIncludedInTotal
                    ? `${selectedCategoryName} is included in Total Expenses (ON). Click to turn OFF.`
                    : `${selectedCategoryName} is excluded from Total Expenses (OFF). Click to turn ON.`
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-emerald-500 active:scale-95 ${
                  isIncludedInTotal
                    ? 'bg-emerald-600'
                    : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isIncludedInTotal ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                className={`text-[10px] font-bold tracking-tight w-6 transition-colors ${
                  isIncludedInTotal
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {isIncludedInTotal ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
