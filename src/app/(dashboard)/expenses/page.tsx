'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FinanceService } from '@/lib/mongodb/data-service';
import { Expense } from '@/types';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';
import { useExcludedCategories } from '@/lib/exclusions';
import { Search, Trash2, Pencil, Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { EditExpenseModal } from '@/components/expenses/edit-expense-modal';

interface DayGroup {
  date: string;
  displayDate: string;
  dayOfWeek: string;
  totalAmount: number;
  expenses: Expense[];
}

export default function ExpensesPage({
  refreshKey = 0,
  onOpenQuickAdd,
}: {
  refreshKey?: number;
  onOpenQuickAdd?: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [categories, setCategories] = useState<any[]>([]);

  // Edit / Modify expense modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Month-scoped excluded categories
  const { excludedCategories, isExcluded } = useExcludedCategories(selectedMonth, selectedYear);

  const loadCategories = async () => {
    const cats = await FinanceService.getCategories();
    setCategories(cats.filter((c) => c.type === 'expense'));
  };

  useEffect(() => {
    loadCategories();
  }, [refreshKey]);

  const monthOptions = [
    { month: 1, year: 2026, label: 'Jan 2026' },
    { month: 2, year: 2026, label: 'Feb 2026' },
    { month: 3, year: 2026, label: 'Mar 2026' },
    { month: 4, year: 2026, label: 'Apr 2026' },
    { month: 5, year: 2026, label: 'May 2026' },
    { month: 6, year: 2026, label: 'Jun 2026' },
    { month: 7, year: 2026, label: 'Jul 2026' },
    { month: 8, year: 2026, label: 'Aug 2026' },
    { month: 9, year: 2026, label: 'Sep 2026' },
    { month: 10, year: 2026, label: 'Oct 2026' },
    { month: 11, year: 2026, label: 'Nov 2026' },
    { month: 12, year: 2026, label: 'Dec 2026' },
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const loadExpenses = async () => {
    const list = await FinanceService.getExpenses(selectedMonth, selectedYear);
    setExpenses(list);
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth, selectedYear, refreshKey]);

  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Are you sure you want to delete "${description}"?`)) {
      await FinanceService.deleteExpense(id);
      await loadExpenses();
    }
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setIsEditModalOpen(true);
  };

  const handleExpenseUpdated = async () => {
    await loadExpenses();
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.category && e.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Find selected category object for robust name and ID matching
    const selectedCatObj = categories.find((c) => c.id === selectedCategory);
    const matchesCategory =
      selectedCategory === 'all' ||
      e.category_id === selectedCategory ||
      (e.category && e.category.id === selectedCategory) ||
      (selectedCatObj &&
        e.category &&
        e.category.name &&
        e.category.name.trim().toLowerCase() === selectedCatObj.name.trim().toLowerCase());

    return matchesSearch && matchesCategory;
  });

  // Group filtered expenses chronologically by day
  const groupedExpenses = useMemo(() => {
    const groups: DayGroup[] = [];
    const map = new Map<string, DayGroup>();

    filteredExpenses.forEach((exp) => {
      const dateKey = exp.expense_date;
      let group = map.get(dateKey);
      if (!group) {
        const d = new Date(dateKey);
        const dayOfWeek = isNaN(d.getTime())
          ? ''
          : d.toLocaleDateString('en-US', { weekday: 'short' });

        group = {
          date: dateKey,
          displayDate: formatDate(dateKey),
          dayOfWeek,
          totalAmount: 0,
          expenses: [],
        };
        map.set(dateKey, group);
        groups.push(group);
      }

      // If viewing all categories, only include active (non-excluded) categories in Day Total
      const isItemExcluded = selectedCategory === 'all' && isExcluded(exp);
      if (!isItemExcluded) {
        group.totalAmount += Number(exp.amount);
      }
      group.expenses.push(exp);
    });

    return groups;
  }, [filteredExpenses, selectedCategory, isExcluded]);

  // When All Categories is selected, total strictly includes active (non-excluded) categories
  const totalFiltered = useMemo(() => {
    if (selectedCategory !== 'all') {
      return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    }
    return filteredExpenses.reduce((sum, e) => {
      if (isExcluded(e)) return sum;
      return sum + Number(e.amount);
    }, 0);
  }, [filteredExpenses, selectedCategory, isExcluded]);

  const renderMonthSelector = () => (
    <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-0.5 shadow-2xs shrink-0">
      <button
        onClick={handlePrevMonth}
        title="Previous Month"
        className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div className="relative flex items-center px-1">
        <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1 pointer-events-none shrink-0" />
        <select
          value={`${selectedMonth}-${selectedYear}`}
          onChange={(e) => {
            const [m, y] = e.target.value.split('-').map(Number);
            setSelectedMonth(m);
            setSelectedYear(y);
          }}
          className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer py-0.5"
        >
          {monthOptions.map((opt) => (
            <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleNextMonth}
        title="Next Month"
        className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Top Header: Neat & Responsive Alignment */}
      <div className="flex flex-col gap-1 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        {/* Row 1: Title & Month Selector */}
        <div className="flex items-center justify-between gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expenses
          </h1>

          {/* Month Selector */}
          {renderMonthSelector()}
        </div>

        {/* Row 2: Total Amount on Next Line */}
        <div className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-400">
          {formatCurrency(totalFiltered)}
        </div>
      </div>

      {/* Compact Search & Category Filter Toolbar */}
      <div className="flex items-center gap-2 w-full">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none pl-2.5 pr-7 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs max-w-[145px] sm:max-w-[180px] truncate"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-xs sm:text-sm">
            No expenses found matching your filter.
          </div>
        ) : (
          <>
            {/* Mobile Card Feed Grouped by Day */}
            <div className="flex flex-col block sm:hidden">
              {groupedExpenses.map((group) => (
                <div key={group.date} className="flex flex-col border-b last:border-b-0 border-zinc-200/70 dark:border-zinc-800/70">
                  {/* Mobile Day Header Banner */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-100/80 dark:bg-zinc-800/70 border-b border-zinc-200/60 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {group.dayOfWeek ? `${group.dayOfWeek}, ` : ''}{group.displayDate}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold">
                        {group.expenses.length}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(group.totalAmount)}
                    </div>
                  </div>

                  {/* Expenses in this day */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {group.expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="py-2.5 px-3 flex items-center justify-between gap-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: exp.category?.color || '#10B981' }}
                          />
                          <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {exp.description || exp.category?.name || 'Expense'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-xs sm:text-sm font-bold ${
                                isExcluded(exp)
                                  ? 'text-zinc-400 dark:text-zinc-500 line-through'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              -{formatCurrency(exp.amount)}
                            </span>
                            {isExcluded(exp) ? (
                              <span className="text-[9px] font-semibold px-1 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                Excluded
                              </span>
                            ) : exp.description?.toLowerCase().includes('mess food bill') ? (
                              <span className="text-[9px] font-bold px-1 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                Paid Bill
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exp)}
                              title="Modify expense (amount, category, date)"
                              aria-label="Modify expense"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors active:scale-95 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp.id, exp.description)}
                              aria-label="Delete expense"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Grouped by Day */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                {groupedExpenses.map((group) => (
                  <tbody
                    key={group.date}
                    className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border-t first:border-t-0 border-zinc-200 dark:border-zinc-800"
                  >
                    {/* Day Group Header Banner */}
                    <tr className="bg-zinc-100/75 dark:bg-zinc-800/50">
                      <td colSpan={4} className="py-2 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-wide">
                              {group.dayOfWeek ? `${group.dayOfWeek}, ` : ''}{group.displayDate}
                            </span>
                            <span className="text-[11px] px-2 py-0.2 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200 dark:border-zinc-700">
                              {group.expenses.length} {group.expenses.length === 1 ? 'txn' : 'txns'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="text-zinc-400 font-normal">Day Total:</span>
                            <span>-{formatCurrency(group.totalAmount)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expenses within this Day */}
                    {group.expenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* 1. Category */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${exp.category?.color || '#10B981'}15`,
                              color: exp.category?.color || '#10B981',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: exp.category?.color || '#10B981' }}
                            />
                            {exp.category?.name || 'Other'}
                          </span>
                        </td>

                        {/* 2. Amount */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                isExcluded(exp)
                                  ? 'text-zinc-400 dark:text-zinc-500 line-through'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              -{formatCurrency(exp.amount)}
                            </span>
                            {isExcluded(exp) ? (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                Excluded
                              </span>
                            ) : exp.description?.toLowerCase().includes('mess food bill') ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                Paid Bill
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 3. Description */}
                        <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          <div>{exp.description}</div>
                          {exp.notes && (
                            <div className="text-[11px] text-zinc-400 font-normal">{exp.notes}</div>
                          )}
                        </td>

                        {/* 4. Actions */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exp)}
                              title="Modify expense (amount, category, date)"
                              aria-label="Modify expense"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors active:scale-95 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp.id, exp.description)}
                              title="Delete expense"
                              aria-label="Delete expense"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modify / Edit Expense Modal */}
      <EditExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        expense={editingExpense}
        categories={categories}
        onUpdated={handleExpenseUpdated}
      />
    </div>
  );
}
