'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { useAuth } from '@/context/auth-context';
import { Income, Category } from '@/types';
import { formatCurrency, formatDate, getTodayDateString, getMonthName } from '@/lib/utils';
import { Plus, Trash2, ArrowUpCircle, ChevronLeft, ChevronRight, Calendar, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function IncomePage() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);

  // Form states
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick category creation inside modal
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const refreshIncomeCategories = async () => {
    const cats = await SupabaseFinanceService.getCategories();
    const incomeCats = cats.filter((c) => c.type === 'income');
    setIncomeCategories(incomeCats);
    if (incomeCats.length > 0) {
      if (!source || !incomeCats.some((c) => c.name === source)) {
        setSource(incomeCats[0].name);
      }
    } else {
      setSource('Salary');
    }
  };

  useEffect(() => {
    refreshIncomeCategories();
  }, [isModalOpen]);

  const monthOptions = [
    { month: 0, year: 0, label: 'All Incomes (All-Time)' },
    { month: 1, year: 2026, label: 'January 2026' },
    { month: 2, year: 2026, label: 'February 2026' },
    { month: 3, year: 2026, label: 'March 2026' },
    { month: 4, year: 2026, label: 'April 2026' },
    { month: 5, year: 2026, label: 'May 2026' },
    { month: 6, year: 2026, label: 'June 2026' },
    { month: 7, year: 2026, label: 'July 2026' },
    { month: 8, year: 2026, label: 'August 2026' },
    { month: 9, year: 2026, label: 'September 2026' },
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
  ];

  const [allTimeIncomes, setAllTimeIncomes] = useState<Income[]>([]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(9);
      setSelectedYear(2026);
      return;
    }
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(9);
      setSelectedYear(2026);
      return;
    }
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const loadIncomes = async () => {
    const all = await SupabaseFinanceService.getIncomes();
    setAllTimeIncomes(all);

    if (selectedMonth === 0) {
      setIncomes(all);
    } else {
      const list = await SupabaseFinanceService.getIncomes(selectedMonth, selectedYear);
      setIncomes(list);
    }
  };

  useEffect(() => {
    loadIncomes();
  }, [selectedMonth, selectedYear]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this income record?')) {
      await SupabaseFinanceService.deleteIncome(id);
      await loadIncomes();
    }
  };

  const handleCreateQuickCategory = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    const created = await SupabaseFinanceService.addCategory({
      user_id: user?.id || null,
      name: clean,
      type: 'income',
      color: '#10B981',
      icon: 'DollarSign',
    });

    await refreshIncomeCategories();
    setSource(created.name);
    setNewCatName('');
    setIsCreatingCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const finalSource = source.trim() || 'Salary';

    setIsSubmitting(true);
    setError(null);

    try {
      await SupabaseFinanceService.addIncome({
        user_id: user?.id || 'user-default-1',
        source: finalSource,
        amount: numAmount,
        description: description.trim() || null,
        income_date: incomeDate,
        notes: notes.trim() || null,
      });

      // If user added income in a different month/year, automatically switch view so it displays immediately
      const [incY, incM] = incomeDate.split('-').map(Number);
      if (incM && incY && (incM !== selectedMonth || incY !== selectedYear)) {
        setSelectedMonth(incM);
        setSelectedYear(incY);
      } else {
        await loadIncomes();
      }

      setToastMessage('Income added successfully!');
      setTimeout(() => {
        setToastMessage(null);
        setAmount('');
        setDescription('');
        setNotes('');
        setIsSubmitting(false);
        setIsModalOpen(false);
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save income. Please try again.');
      setIsSubmitting(false);
    }
  };

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Compact Header */}
      <div className="flex flex-col gap-1.5 pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Income
          </h1>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Month Selector */}
            <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="relative flex items-center px-1">
                <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1 pointer-events-none" />
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

            <button
              onClick={() => {
                setError(null);
                setToastMessage(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>+ Add Income</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedMonth === 0 ? 'All-Time Records' : `${getMonthName(selectedMonth)} ${selectedYear}`} • Total Credited:{' '}
          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
            {formatCurrency(totalIncome)}
          </strong>
        </div>
      </div>

      {/* Cross-month notification banner if current month is empty but records exist elsewhere */}
      {selectedMonth !== 0 && incomes.length === 0 && allTimeIncomes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">💡</span>
            <div className="flex flex-col">
              <span className="font-semibold">
                No direct income logged for {getMonthName(selectedMonth)} {selectedYear}.
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">
                Found {formatCurrency(allTimeIncomes.reduce((s, i) => s + Number(i.amount), 0))} recorded in other months (e.g. &quot;{allTimeIncomes[0].source}&quot; on {formatDate(allTimeIncomes[0].income_date)}). Unspent allowance is automatically carried forward to your dashboard balance.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedMonth(0);
              setSelectedYear(0);
            }}
            className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700/80 rounded-lg text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-50 dark:hover:bg-zinc-800 text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
          >
            View All Incomes &rarr;
          </button>
        </div>
      )}

      {/* Income List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
        {incomes.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-xs sm:text-sm">
            No income entries recorded for this period.
          </div>
        ) : (
          <>
            {/* Mobile Card Feed */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 block sm:hidden">
              {incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 flex items-center justify-between gap-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {inc.description || inc.source || 'Income'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {inc.source}
                        </span>
                        <span>•</span>
                        <span>{formatDate(inc.income_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(inc.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(inc.id)}
                      aria-label="Delete income"
                      className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Source</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center w-12">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {incomes.map((inc) => (
                    <tr
                      key={inc.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-medium">
                        {formatDate(inc.income_date)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                          <ArrowUpCircle className="w-3 h-3" />
                          <span>{inc.source}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div>{inc.description || 'Stipend / Earnings'}</div>
                        {inc.notes && (
                          <div className="text-[11px] text-zinc-400 font-normal">{inc.notes}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(inc.amount)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(inc.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />
            
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Add Income
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium mb-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {toastMessage && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium mb-2 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              {/* Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {/* Source / Category */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Income Source / Category *
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
                      onClick={() => setIsModalOpen(false)}
                      className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline"
                    >
                      Manage
                    </Link>
                  </div>
                </div>

                <select
                  value={source}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsCreatingCat(true);
                    } else {
                      setSource(e.target.value);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {incomeCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {source && !incomeCategories.some((c) => c.name.toLowerCase() === source.toLowerCase()) && (
                    <option value={source}>{source}</option>
                  )}
                  <option value="__add_new__">+ Add New Income Source...</option>
                </select>

                {/* Quick Source Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {['Dad', 'Pocket Money', 'Salary', 'Freelance', 'Stipend', 'Gift'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSource(preset)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        source.toLowerCase() === preset.toLowerCase()
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Inline Income Category Creator */}
              {isCreatingCat && (
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-emerald-500/40 rounded-xl flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Quick Add Income Source
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
                      placeholder="e.g. Consulting, Dividends"
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
                </div>
              )}

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Date *</label>
                <input
                  type="date"
                  required
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly stipend, Contract payout"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-2xs shadow-emerald-600/20 cursor-pointer transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
