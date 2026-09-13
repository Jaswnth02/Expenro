'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { FinanceService } from '@/lib/mongodb/data-service';
import { useAuth } from '@/context/auth-context';
import { useMonth } from '@/context/month-context';
import { Income, Category } from '@/types';
import { formatCurrency, formatDate, getTodayDateString, getMonthName } from '@/lib/utils';
import {
  Plus,
  ArrowUpRight,
  ArrowUpCircle,
  Settings,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SetBalanceModal } from '@/components/dashboard/set-balance-modal';
import { useContextualAdd } from '@/context/contextual-add-context';

export default function IncomePage() {
  const { user } = useAuth();
  const { selectedMonth, selectedYear, setMonth } = useMonth();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLowBalance, setIsLowBalance] = useState<boolean>(false);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);

  // Modals & Popovers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isSetBalanceOpen, setIsSetBalanceOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { registerAddHandler } = useContextualAdd();

  // Contextual Add listener: when bottom mobile "+" button is tapped on /income, open Add Income modal
  useEffect(() => {
    const unregister = registerAddHandler('income', () => {
      setEditingIncome(null);
      setAmount('');
      setDescription('');
      setNotes('');
      setIncomeDate(getTodayDateString());
      setError(null);
      setIsModalOpen(true);
    });

    const handleWindowEvent = () => {
      setEditingIncome(null);
      setAmount('');
      setDescription('');
      setNotes('');
      setIncomeDate(getTodayDateString());
      setError(null);
      setIsModalOpen(true);
    };
    window.addEventListener('expenro:trigger-add', handleWindowEvent);

    return () => {
      unregister();
      window.removeEventListener('expenro:trigger-add', handleWindowEvent);
    };
  }, [registerAddHandler]);

  // Search & Filter states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Form states (Add / Edit)
  const [source, setSource] = useState('Dad');
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

  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close action menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshIncomeCategories = useCallback(async () => {
    try {
      const cats = await FinanceService.getCategories();
      const incomeCats = cats.filter((c) => c.type === 'income');
      setIncomeCategories(incomeCats);
      if (incomeCats.length > 0 && !source) {
        setSource(incomeCats[0].name);
      }
    } catch {
      // Fallback
    }
  }, [source]);

  // Initial category load
  useEffect(() => {
    let active = true;
    FinanceService.getCategories()
      .then((cats) => {
        if (!active) return;
        const incomeCats = cats.filter((c) => c.type === 'income');
        setIncomeCategories(incomeCats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Fetch incomes and balance asynchronously for active month
  const loadIncomes = useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([
        FinanceService.getIncomes(selectedMonth, selectedYear),
        FinanceService.getFinancialSummary(selectedMonth, selectedYear),
      ]);
      setIncomes(list);
      setWalletBalance(summary.availableBalance ?? summary.remainingBalance);
      setIsLowBalance(summary.isLowBalance ?? false);
    } catch (err) {
      console.error('Failed to load income data:', err);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const [list, summary] = await Promise.all([
          FinanceService.getIncomes(selectedMonth, selectedYear),
          FinanceService.getFinancialSummary(selectedMonth, selectedYear),
        ]);
        if (!active) return;
        setIncomes(list);
        setWalletBalance(summary.availableBalance ?? summary.remainingBalance);
        setIsLowBalance(summary.isLowBalance ?? false);
      } catch (err) {
        console.error('Failed to load income data:', err);
      }
    };
    void fetch();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear]);

  const handleOpenAddModal = () => {
    void refreshIncomeCategories();
    setEditingIncome(null);
    setAmount('');
    setSource('Dad');
    setDescription('');
    setIncomeDate(getTodayDateString());
    setNotes('');
    setError(null);
    setToastMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (inc: Income) => {
    void refreshIncomeCategories();
    setActiveMenuId(null);
    setEditingIncome(inc);
    setAmount(String(inc.amount));
    setSource(inc.source || 'Dad');
    setDescription(inc.description || '');
    setIncomeDate(inc.income_date);
    setNotes(inc.notes || '');
    setError(null);
    setToastMessage(null);
    setIsModalOpen(true);
  };

  // Delete confirmation state
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteIncome = async () => {
    if (!incomeToDelete) return;
    const targetId = incomeToDelete.id;
    setIsDeleting(true);
    try {
      // Optimistic update
      setIncomes((prev) => prev.filter((item) => item.id !== targetId));
      await FinanceService.deleteIncome(targetId);
      await loadIncomes();
      setIncomeToDelete(null);
      setToastMessage('Income record deleted successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete income:', err);
      setError('Failed to delete income record. Please try again.');
      await loadIncomes();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (inc: Income) => {
    setActiveMenuId(null);
    setIncomeToDelete(inc);
  };

  const handleCreateQuickCategory = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    const created = await FinanceService.addCategory({
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

    const finalSource = source.trim() || 'Income';

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingIncome) {
        await FinanceService.updateIncome(editingIncome.id, {
          source: finalSource,
          amount: numAmount,
          description: description.trim() || null,
          income_date: incomeDate,
          notes: notes.trim() || null,
        });
        setToastMessage('Income updated successfully!');
      } else {
        await FinanceService.addIncome({
          user_id: user?.id || 'user-default-1',
          source: finalSource,
          amount: numAmount,
          description: description.trim() || null,
          income_date: incomeDate,
          notes: notes.trim() || null,
        });

        // Switch to the month of the added income if different
        const [incY, incM] = incomeDate.split('-').map(Number);
        if (incM && incY && (incM !== selectedMonth || incY !== selectedYear)) {
          setMonth(incM, incY);
        }
        setToastMessage('Income added successfully!');
      }

      await loadIncomes();

      setTimeout(() => {
        setToastMessage(null);
        setIsSubmitting(false);
        setIsModalOpen(false);
        setEditingIncome(null);
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save income. Please try again.';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  // Total income calculated for active month
  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [incomes]);

  // Unique income sources for filter chips
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    incomes.forEach((i) => {
      if (i.source) set.add(i.source.trim());
    });
    return Array.from(set);
  }, [incomes]);

  // Filtered and sorted transactions
  const filteredIncomes = useMemo(() => {
    let result = [...incomes];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          (i.source && i.source.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      );
    }

    // Filter by source
    if (selectedSourceFilter !== 'all') {
      result = result.filter(
        (i) => i.source && i.source.toLowerCase() === selectedSourceFilter.toLowerCase()
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.income_date).getTime() - new Date(a.income_date).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.income_date).getTime() - new Date(b.income_date).getTime();
      }
      if (sortBy === 'highest') {
        return Number(b.amount) - Number(a.amount);
      }
      return 0;
    });

    return result;
  }, [incomes, searchQuery, selectedSourceFilter, sortBy]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-4xl mx-auto pb-12">
      {/* 1. HERO INCOME CARD */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#E6F8F3] via-[#ECFAF6] to-[#DCF5EE] dark:from-[#064e3b]/30 dark:via-[#042f2e]/40 dark:to-zinc-900/90 border border-emerald-100/90 dark:border-emerald-800/40 p-5 sm:p-6 shadow-xs select-none">
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col min-w-0 flex-1 pr-2">
            {/* Small label */}
            <span className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Income
            </span>

            {/* Clean Month Heading (fits on single line, controlled by top bar month selector) */}
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-0.5 truncate">
              {getMonthName(selectedMonth)} {selectedYear}
            </h1>

            {/* Subtitle: Total Income • X transaction(s) */}
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
              Total Income • {incomes.length} {incomes.length === 1 ? 'transaction' : 'transactions'}
            </p>

            {/* Big Amount */}
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-2">
              {formatCurrency(totalIncome)}
            </div>
          </div>

          {/* Right: Floating action button (↗) + Wallet graphic */}
          <div className="relative shrink-0 flex items-center justify-center">
            {/* SVG Wallet Illustration */}
            <div className="w-28 h-24 sm:w-36 sm:h-32 relative">
              <svg
                width="140"
                height="120"
                viewBox="0 0 140 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full select-none pointer-events-none"
              >
                {/* Soft background wave curve */}
                <path
                  d="M20 120C20 70 65 35 140 30V120H20Z"
                  fill="#A7F3D0"
                  fillOpacity="0.4"
                />

                {/* Spark lines */}
                <path
                  d="M44 26L38 20"
                  stroke="#047857"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M54 18L54 10"
                  stroke="#047857"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M66 22L72 16"
                  stroke="#047857"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Currency note angled in background */}
                <g transform="rotate(-12 50 40)">
                  <rect
                    x="38"
                    y="18"
                    width="65"
                    height="42"
                    rx="6"
                    fill="#A7F3D0"
                    stroke="#6EE7B7"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="43"
                    y="23"
                    width="55"
                    height="32"
                    rx="4"
                    fill="#86EFAC"
                    fillOpacity="0.4"
                  />
                  <circle cx="70.5" cy="39" r="7.5" fill="#6EE7B7" />
                  <circle cx="70.5" cy="39" r="4.5" fill="#A7F3D0" />
                </g>

                {/* Wallet base */}
                <rect
                  x="30"
                  y="46"
                  width="100"
                  height="72"
                  rx="14"
                  fill="#00796B"
                />

                {/* Wallet flap & body depth */}
                <path
                  d="M30 46H130V68C130 74 125 79 119 79H98C91 79 86 84 86 91C86 94 83 97 80 97H64C57 97 52 92 52 85V46H30Z"
                  fill="#00695C"
                />

                {/* Wallet latch tab */}
                <rect
                  x="80"
                  y="70"
                  width="30"
                  height="22"
                  rx="8"
                  fill="#004D40"
                />
                <circle cx="95" cy="81" r="4.5" fill="#A7F3D0" />
                <circle cx="95" cy="81" r="2" fill="#004D40" />
              </svg>

              {/* Floating Emerald Action Button (↗) */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                aria-label="Add Income"
                title="Add New Income"
                className="absolute top-1 right-1 sm:top-2 sm:right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/25 ring-3 ring-white dark:ring-zinc-900 cursor-pointer active:scale-95 transition-all z-20"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AVAILABLE BALANCE CARD */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-colors">
        <div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Available Balance
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                walletBalance <= 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : isLowBalance
                  ? 'text-[#F97316] dark:text-orange-400'
                  : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {formatCurrency(walletBalance)}
            </span>
            {isLowBalance && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60">
                Low Balance
              </span>
            )}
          </div>
        </div>

        {/* Set Balance Button */}
        <button
          type="button"
          onClick={() => setIsSetBalanceOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors shadow-2xs cursor-pointer active:scale-95"
        >
          <Settings className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Set Balance</span>
        </button>
      </div>

      {/* 3. TRANSACTIONS SECTION */}
      <div className="flex flex-col gap-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Transactions
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              aria-label="Search transactions"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFilterOpen || selectedSourceFilter !== 'all' || sortBy !== 'newest'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              aria-label="Filter transactions"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        {isSearchOpen && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-150">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by source, description or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-9 py-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Collapsible Filter Bar */}
        {isFilterOpen && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Filter by Source:</span>
              {(selectedSourceFilter !== 'all' || sortBy !== 'newest') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSourceFilter('all');
                    setSortBy('newest');
                  }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedSourceFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedSourceFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                All Sources
              </button>
              {availableSources.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSourceFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedSourceFilter.toLowerCase() === s.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Sort by:</span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'highest', label: 'Highest Amount' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      sortBy === opt.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions List Cards */}
        {filteredIncomes.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
              <ArrowUpCircle className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {searchQuery || selectedSourceFilter !== 'all'
                  ? 'No matching income transactions'
                  : 'No income logged for this period'}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                {searchQuery || selectedSourceFilter !== 'all'
                  ? 'Try changing your search terms or filter.'
                  : 'Replenishment money sent by family or earned can be logged here.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Received Money</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5" ref={actionMenuRef}>
            {filteredIncomes.map((inc) => {
              const isMenuOpen = activeMenuId === inc.id;
              return (
                <div
                  key={inc.id}
                  className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors relative"
                >
                  {/* Left: Round icon + Source and Date */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-full bg-[#E8F8F2] dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                      <ArrowUpCircle className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {inc.source || inc.description || 'Income'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                        <span>Income</span>
                        <span>•</span>
                        <span>{formatDate(inc.income_date)}</span>
                        {inc.description && inc.description !== inc.source && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">
                              {inc.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: +Amount and Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-extrabold text-base sm:text-lg text-emerald-600 dark:text-emerald-400 mr-1">
                      +{formatCurrency(inc.amount)}
                    </span>

                    {/* Quick Edit Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(inc);
                      }}
                      title="Edit Income"
                      aria-label="Edit Income"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Quick Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(inc);
                      }}
                      title="Delete Income"
                      aria-label="Delete Income"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. ADD / EDIT INCOME MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {editingIncome ? 'Edit Income' : 'Add Income'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingIncome(null);
                }}
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Amount (₹) *
                </label>
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
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
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

                {/* Quick Source Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {['Dad', 'Pocket Money', 'Mom', 'Allowance', 'Family', 'Salary', 'Freelance', 'Stipend'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSource(preset)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
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
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Date *
                </label>
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
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pocket money, Monthly stipend"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                {editingIncome ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDelete = editingIncome;
                      setIsModalOpen(false);
                      setEditingIncome(null);
                      handleDelete(toDelete);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingIncome(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : editingIncome
                      ? 'Update Income'
                      : 'Save Income'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE DIALOG */}
      {incomeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Income Record?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-100">+{formatCurrency(incomeToDelete.amount)}</strong> from <strong className="text-zinc-900 dark:text-zinc-100">{incomeToDelete.source}</strong>? This action cannot be undone and will update your wallet balance.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIncomeToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteIncome}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Income</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Wallet Balance Modal */}
      <SetBalanceModal
        isOpen={isSetBalanceOpen}
        onClose={() => setIsSetBalanceOpen(false)}
        currentBalance={walletBalance}
        onSuccess={loadIncomes}
      />
    </div>
  );
}
