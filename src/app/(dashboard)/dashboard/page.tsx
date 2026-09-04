'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
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
    const adjRemaining = summary.totalIncome - adjExpenses;
    const adjSavingsRate =
      summary.totalIncome > 0
        ? Math.max(0, Math.round(((summary.totalIncome - adjExpenses) / summary.totalIncome) * 100))
        : 0;

    return {
      ...summary,
      totalExpenses: adjExpenses,
      remainingBalance: adjRemaining,
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


      {/* Primary Financial Summary Cards (Total Expenses, Remaining Balance, Selected Category) */}
      <SummaryCards
        summary={summary}
        expenses={expenses}
        categories={categories}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
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
    </div>
  );
}
