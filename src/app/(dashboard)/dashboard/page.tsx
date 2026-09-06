'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { SetBalanceModal } from '@/components/dashboard/set-balance-modal';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { CategoryBreakdownCard } from '@/components/dashboard/category-breakdown-card';
import { SavingsPreviewCard } from '@/components/dashboard/savings-preview-card';
import { HealthScoreCard } from '@/components/dashboard/health-score-card';
import { InsightsCard } from '@/components/dashboard/insights-card';
import { DueRegularExpensesCard } from '@/components/dashboard/due-regular-expenses-card';
import { LocalFinanceStore } from '@/lib/data-service';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import {
  calculateFinancialHealthScore,
  generateFinancialInsights,
} from '@/lib/calculations/finance';
import { formatCurrency } from '@/lib/utils';
import { useExcludedCategories } from '@/lib/exclusions';
import {
  Expense,
  Income,
  SavingsGoal,
  Budget,
  FinancialSummary,
  FinancialHealthScore,
  FinancialInsight,
  Category,
} from '@/types';

interface DashboardPageProps {
  refreshKey?: number;
  onOpenQuickAdd?: (mode?: 'regular' | 'manual') => void;
}

export default function DashboardPage({
  refreshKey = 0,
  onOpenQuickAdd,
}: DashboardPageProps) {
  // Selected month and year (Default to September 2026 as per spec)
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);

  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    remainingBalance: 0,
    savingsRate: 0,
    month: 9,
    year: 2026,
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [healthScore, setHealthScore] = useState<FinancialHealthScore>({
    score: 75,
    rating: 'Good',
    explanation: 'Calculating financial health...',
    factors: [],
  });
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetBalanceOpen, setIsSetBalanceOpen] = useState(false);

  // Month-scoped category exclusions
  const { excludedCategories, filterIncluded, isExcluded } = useExcludedCategories(selectedMonth, selectedYear);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [dbSummary, activeExpenses, activeIncomes, activeGoals, activeBudgets, activeCategories] =
        await Promise.all([
          SupabaseFinanceService.getFinancialSummary(selectedMonth, selectedYear),
          SupabaseFinanceService.getExpenses(selectedMonth, selectedYear),
          SupabaseFinanceService.getIncomes(selectedMonth, selectedYear),
          SupabaseFinanceService.getSavingsGoals(),
          SupabaseFinanceService.getBudgets(selectedMonth, selectedYear),
          SupabaseFinanceService.getCategories(),
        ]);

      setSummary(dbSummary);
      setExpenses(activeExpenses);
      setIncomes(activeIncomes);
      setSavingsGoals(activeGoals);
      setBudgets(activeBudgets);
      setCategories(activeCategories);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, refreshKey]);

  // Excluded categories sum for current month
  const excludedSum = useMemo(() => {
    return expenses.reduce((sum, e) => {
      if (isExcluded(e.category?.name)) {
        return sum + Number(e.amount || 0);
      }
      return sum;
    }, 0);
  }, [expenses, isExcluded]);

  // Adjusted summary taking exclusions into account everywhere
  const activeSummary = useMemo(() => {
    const adjExpenses = Math.max(0, summary.totalExpenses - excludedSum);
    const available =
      summary.availableBalance !== undefined
        ? summary.availableBalance
        : Math.max(0, summary.totalIncome - adjExpenses);
    const threshold = summary.lowBalanceThreshold ?? 1000;
    const isLow = available <= threshold;
    const adjSavingsRate =
      summary.totalIncome > 0
        ? Math.max(0, Math.round(((summary.totalIncome - adjExpenses) / summary.totalIncome) * 100))
        : 0;

    return {
      ...summary,
      totalExpenses: adjExpenses,
      remainingBalance: available,
      availableBalance: available,
      isLowBalance: isLow,
      savingsRate: adjSavingsRate,
    };
  }, [summary, excludedSum]);

  // Expenses strictly for included categories
  const includedExpenses = useMemo(() => {
    return filterIncluded(expenses);
  }, [expenses, filterIncluded]);

  // Recalculate health score and insights whenever activeSummary or includedExpenses change
  useEffect(() => {
    const score = calculateFinancialHealthScore(activeSummary, budgets, savingsGoals);
    const dynamicInsights = generateFinancialInsights(
      includedExpenses,
      incomes,
      budgets,
      activeSummary
    );
    setHealthScore(score);
    setInsights(dynamicInsights);
  }, [activeSummary, includedExpenses, incomes, budgets, savingsGoals]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5">
      {/* Top Header with Greeting and Month Selector */}
      <Header
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
        userName="Alex"
      />

      {/* Low Balance Replenishment Banner */}
      {activeSummary.isLowBalance && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-300/40">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>Low Balance Warning</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                  {formatCurrency(activeSummary.availableBalance ?? 0)} left
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 truncate">
                Balance is below your ₹{(activeSummary.lowBalanceThreshold ?? 1000).toLocaleString('en-IN')} safety buffer. When funds arrive, log them here to replenish.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={() => setIsSetBalanceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-white/90 dark:bg-zinc-900/90 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 text-amber-900 dark:text-amber-100 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <span>⚙️ Set Real Balance</span>
            </button>
            <Link
              href="/income"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log Sent Money</span>
            </Link>
          </div>
        </div>
      )}

      {/* Primary Financial Summary Cards (Total Expenses, Remaining Balance, Selected Category) */}
      <SummaryCards
        summary={activeSummary}
        expenses={expenses}
        categories={categories}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onOpenSetBalance={() => setIsSetBalanceOpen(true)}
      />

      {/* Ready to Fill: Regular Expenses Due Today (After Scheduled Time) */}
      <DueRegularExpensesCard
        refreshKey={refreshKey}
        onExpenseAdded={loadDashboardData}
        onOpenChecklistModal={() => onOpenQuickAdd?.('regular')}
      />

      {/* Main Grid: Left (Transactions & Category Breakdown) | Right (Health Score & Goals) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Recent Transactions List */}
          <RecentTransactions
            expenses={expenses}
            onAddExpenseClick={onOpenQuickAdd}
          />

          {/* Category Spending Breakdown */}
          <CategoryBreakdownCard
            expenses={includedExpenses}
            totalExpenses={activeSummary.totalExpenses}
            excludedCategories={excludedCategories}
          />
        </div>

        {/* Right 1 Column (Hidden in mobile view) */}
        <div className="hidden lg:flex flex-col gap-5">
          {/* Financial Health Score Card (0-100) */}
          <HealthScoreCard healthScore={healthScore} />

          {/* Savings Goals Preview Card */}
          <SavingsPreviewCard goals={savingsGoals} />
        </div>
      </div>

      {/* Dynamic Smart Financial Insights */}
      <InsightsCard insights={insights} />

      {/* Set Current Wallet Balance Modal */}
      <SetBalanceModal
        isOpen={isSetBalanceOpen}
        onClose={() => setIsSetBalanceOpen(false)}
        currentBalance={activeSummary.availableBalance ?? activeSummary.remainingBalance}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
