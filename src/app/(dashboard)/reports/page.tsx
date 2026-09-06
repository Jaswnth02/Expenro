'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { Expense, FinancialSummary } from '@/types';
import { formatCurrency, getMonthName } from '@/lib/utils';
import { useExcludedCategories, getExcludedCategories, filterIncludedExpenses } from '@/lib/exclusions';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Month-scoped excluded categories hook for active month
  const { excludedCategories, filterIncluded, isExcluded } = useExcludedCategories(selectedMonth, selectedYear);

  const [currSummary, setCurrSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    remainingBalance: 0,
    savingsRate: 0,
    month: 9,
    year: 2026,
  });

  const [prevSummary, setPrevSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    remainingBalance: 0,
    savingsRate: 0,
    month: 8,
    year: 2026,
  });

  // Calculate preceding month dynamically
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const monthOptions = [
    { month: 6, year: 2026, label: 'June 2026' },
    { month: 7, year: 2026, label: 'July 2026' },
    { month: 8, year: 2026, label: 'August 2026' },
    { month: 9, year: 2026, label: 'September 2026' },
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
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

  // Load real expenses and financial summaries for current and previous months
  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeExpenses, previousExpenses, activeSummary, previousSummary] = await Promise.all([
        SupabaseFinanceService.getExpenses(selectedMonth, selectedYear),
        SupabaseFinanceService.getExpenses(prevMonth, prevYear),
        SupabaseFinanceService.getFinancialSummary(selectedMonth, selectedYear),
        SupabaseFinanceService.getFinancialSummary(prevMonth, prevYear),
      ]);

      setExpenses(activeExpenses);
      setPrevExpenses(previousExpenses);
      setCurrSummary(activeSummary);
      setPrevSummary(previousSummary);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, prevMonth, prevYear]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Filter included expenses for charts and rankings
  const includedExpenses = useMemo(() => {
    return filterIncluded(expenses);
  }, [expenses, filterIncluded]);

  // Filter previous month expenses using its respective month's exclusions
  const prevIncludedExpenses = useMemo(() => {
    const prevExcluded = getExcludedCategories(prevMonth, prevYear);
    return filterIncludedExpenses(prevExpenses, prevExcluded);
  }, [prevExpenses, prevMonth, prevYear]);

  // Aggregate category spending from active included expenses only
  const { categoryData, totalExpenses } = useMemo(() => {
    const catMap = new Map<string, { value: number; color: string; count: number }>();
    let total = 0;

    includedExpenses.forEach((e) => {
      const name = e.category?.name?.trim() || 'Other';
      const color = e.category?.color || '#6B7280';
      const amt = Number(e.amount || 0);
      total += amt;

      const existing = catMap.get(name);
      if (existing) {
        existing.value += amt;
        existing.count += 1;
      } else {
        catMap.set(name, { value: amt, color, count: 1 });
      }
    });

    const list = Array.from(catMap.entries())
      .map(([name, item]) => ({
        name,
        value: item.value,
        color: item.color,
        count: item.count,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return { categoryData: list, totalExpenses: total };
  }, [includedExpenses]);

  // Excluded categories details for transparent notice
  const excludedCategoryData = useMemo(() => {
    const map = new Map<string, { value: number; count: number; color: string }>();
    expenses.forEach((e) => {
      const name = e.category?.name?.trim() || 'Other';
      if (isExcluded(name)) {
        const existing = map.get(name);
        const amt = Number(e.amount || 0);
        if (existing) {
          existing.value += amt;
          existing.count += 1;
        } else {
          map.set(name, { value: amt, count: 1, color: e.category?.color || '#EA580C' });
        }
      }
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
      color: data.color,
    }));
  }, [expenses, isExcluded]);

  // Aggregate daily spending trend from active included expenses only
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, number>();

    includedExpenses.forEach((e) => {
      const dayStr = e.expense_date ? e.expense_date.slice(8) : '01';
      dayMap.set(dayStr, (dayMap.get(dayStr) || 0) + Number(e.amount || 0));
    });

    const monthShort = getMonthName(selectedMonth).slice(0, 3);
    return Array.from(dayMap.entries())
      .map(([day, amount]) => ({
        day: `${monthShort} ${day}`,
        rawDay: Number(day),
        amount,
      }))
      .sort((a, b) => a.rawDay - b.rawDay);
  }, [includedExpenses, selectedMonth]);

  // Consistent like-for-like month-over-month comparison calculations
  const adjCurrTotalExpenses = useMemo(() => {
    return includedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [includedExpenses]);

  const adjPrevTotalExpenses = useMemo(() => {
    return prevIncludedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [prevIncludedExpenses]);

  const adjCurrRemainingBalance = currSummary.availableBalance ?? (currSummary.totalIncome - adjCurrTotalExpenses);
  const adjPrevRemainingBalance = prevSummary.availableBalance ?? (prevSummary.totalIncome - adjPrevTotalExpenses);

  const expDiff =
    adjPrevTotalExpenses > 0
      ? ((adjCurrTotalExpenses - adjPrevTotalExpenses) / adjPrevTotalExpenses) * 100
      : 0;

  const incDiff =
    prevSummary.totalIncome > 0
      ? ((currSummary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100
      : 0;

  const topCategory = categoryData[0];
  const activeDays = dailyData.length;
  const avgDailySpend =
    activeDays > 0 ? Math.round(totalExpenses / activeDays) : 0;

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5">
      {/* Top Header Row with Title & Month Selector */}
      <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              Reports & Analytics
            </h1>
            <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
            {getMonthName(selectedMonth)} {selectedYear} • Live data from {includedExpenses.length} active expenses
            {excludedCategoryData.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                (excl. {excludedCategoryData.map((c) => c.name).join(', ')})
              </span>
            )}
          </p>
        </div>

        {/* Compact Month Navigator */}
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
              aria-label="Select Report Month"
              className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer pr-1 py-0.5"
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
      </div>

      {/* Dynamic Month-over-Month Comparison Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Monthly Comparison: {getMonthName(prevMonth)} vs {getMonthName(selectedMonth)} {selectedYear}
            </h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
            Live Link
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Expenses Comparison */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Expenses
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs text-zinc-400">
                {getMonthName(prevMonth).slice(0, 3)}: {formatCurrency(adjPrevTotalExpenses)}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                {formatCurrency(adjCurrTotalExpenses)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
              {expDiff <= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3 h-3" />
                  <span>{Math.abs(expDiff).toFixed(1)}% decreased (Good)</span>
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+{expDiff.toFixed(1)}% increased</span>
                </span>
              )}
            </div>
          </div>

          {/* Income Comparison */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Income
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs text-zinc-400">
                {getMonthName(prevMonth).slice(0, 3)}: {formatCurrency(prevSummary.totalIncome)}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(currSummary.totalIncome)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {prevSummary.totalIncome > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{incDiff >= 0 ? `+${incDiff.toFixed(1)}%` : `${incDiff.toFixed(1)}%`}</span>
                </span>
              ) : (
                <span>Recorded income</span>
              )}
            </div>
          </div>

          {/* Net Balance / Surplus Comparison */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Net Balance
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs text-zinc-400">
                {getMonthName(prevMonth).slice(0, 3)}: {formatCurrency(adjPrevRemainingBalance)}
              </span>
              <span
                className={`text-sm sm:text-base font-extrabold ${
                  adjCurrRemainingBalance >= 0
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatCurrency(adjCurrRemainingBalance)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span>
                {currSummary.isLowBalance
                  ? 'Low balance alert'
                  : adjCurrRemainingBalance >= 0
                  ? 'Surplus wallet balance'
                  : 'Deficit balance'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Category Breakdown Donut Chart */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Expenses by Category
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              {getMonthName(selectedMonth)} {selectedYear}
            </span>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-zinc-400">
              No expenses recorded for this month.
            </div>
          ) : (
            <>
              <div className="h-52 sm:h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [
                        formatCurrency(Number(value)),
                        'Spent',
                      ]}
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderRadius: '10px',
                        color: '#fff',
                        border: 'none',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with percentages */}
              <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                {categoryData.map((c, index) => (
                  <div
                    key={`${c.name}-${index}`}
                    className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-zinc-400">
                      ({formatCurrency(c.value)} · {c.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Spending Trend Bar Chart */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Daily Spending Trend
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              {dailyData.length} active day{dailyData.length === 1 ? '' : 's'}
            </span>
          </div>

          {dailyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-zinc-400">
              No daily transactions in this month.
            </div>
          ) : (
            <div className="h-52 sm:h-56 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis
                    dataKey="day"
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Spent']}
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderRadius: '10px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '11px',
                      padding: '6px 10px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Category Performance & Key Highlights (Replacing Payment Method Analytics) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Category Spending Breakdown & Ranking
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            {categoryData.length} categories
          </span>
        </div>

        {categoryData.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            No expenses recorded for this period.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {categoryData.map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(cat.value)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden my-1">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                  <span>{cat.count} {cat.count === 1 ? 'transaction' : 'transactions'}</span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">{cat.percentage}% of total</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transparent notice for categories excluded from reports */}
        {excludedCategoryData.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">
                <strong>Excluded from reports & totals:</strong>{' '}
                {excludedCategoryData.map((c) => `${c.name} (${formatCurrency(c.value)}, ${c.count} txns)`).join(' · ')}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0 ml-2">
              Toggled OFF in Dashboard
            </span>
          </div>
        )}

        {/* Quick Highlights Row */}
        {topCategory && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950">
              <span className="text-[10px] text-zinc-400 block">Top Category</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                {topCategory.name} ({formatCurrency(topCategory.value)})
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950">
              <span className="text-[10px] text-zinc-400 block">Active Transactions</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                {includedExpenses.length} txns
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950">
              <span className="text-[10px] text-zinc-400 block">Active Days</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                {activeDays} days
              </span>
            </div>
            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950">
              <span className="text-[10px] text-zinc-400 block">Avg / Active Day</span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                {formatCurrency(avgDailySpend)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
