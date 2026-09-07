'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  History,
} from 'lucide-react';
import { MealDuesSummaryCard } from '@/components/meals/meal-dues-summary-card';
import { QuickMealLogger } from '@/components/meals/quick-meal-logger';
import { MonthlyMealCalendar } from '@/components/meals/monthly-meal-calendar';
import { SettleDuesModal } from '@/components/meals/settle-dues-modal';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import {
  MonthlyMealSummary,
  MealEntry,
  MealSettlement,
  MealType,
  MealStatus,
  PaymentMethod,
} from '@/types';
import { formatCurrency, formatDate, getMonthName, getTodayDateString, cn } from '@/lib/utils';

export default function MealTrackerPage({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const today = getTodayDateString();
  const [initialYear, initialMonth] = today.split('-').map(Number);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth || 9);
  const [selectedYear, setSelectedYear] = useState(initialYear || 2026);
  const [selectedDate, setSelectedDate] = useState(today);

  const [summary, setSummary] = useState<MonthlyMealSummary>({
    month: selectedMonth,
    year: selectedYear,
    totalAmountSpent: 0,
    totalUnpaidDues: 0,
    totalMealsEaten: 0,
    totalMealsSkipped: 0,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0,
    customCount: 0,
    isSettled: false,
    settlement: null,
    entries: [],
  });

  const [pastSettlements, setPastSettlements] = useState<MealSettlement[]>([]);
  const [activeTab, setActiveTab] = useState<'tracker' | 'history'>('tracker');
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [sum, settlements] = await Promise.all([
        SupabaseFinanceService.getMonthlyMealSummary(selectedMonth, selectedYear),
        SupabaseFinanceService.getMealSettlements(),
      ]);
      setSummary(sum);
      setPastSettlements(settlements);
    } catch {
      // Fallback
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      SupabaseFinanceService.getMonthlyMealSummary(selectedMonth, selectedYear),
      SupabaseFinanceService.getMealSettlements(),
    ]).then(([sum, settlements]) => {
      if (isMounted) {
        setSummary(sum);
        setPastSettlements(settlements);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear, refreshKey]);

  // Month navigation helpers
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

  // Add meal
  const handleAddMeal = async (entry: {
    meal_type: MealType;
    name: string;
    amount: number;
    status: MealStatus;
    notes?: string;
  }) => {
    await SupabaseFinanceService.addMealEntry({
      user_id: 'user-default-1',
      date: selectedDate,
      meal_type: entry.meal_type,
      name: entry.name,
      amount: entry.amount,
      status: entry.status,
      notes: entry.notes || null,
      is_settled: summary.isSettled,
      settlement_id: summary.settlement?.id || null,
    });
    await refreshData();
  };

  // Update meal
  const handleUpdateMeal = async (id: string, updates: Partial<MealEntry>) => {
    await SupabaseFinanceService.updateMealEntry(id, updates);
    await refreshData();
  };

  // Delete meal
  const handleDeleteMeal = async (id: string) => {
    await SupabaseFinanceService.deleteMealEntry(id);
    await refreshData();
  };

  // Settle dues
  const handleSettleDues = async (params: {
    month: number;
    year: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    createExpense: boolean;
    notes?: string;
  }) => {
    await SupabaseFinanceService.settleMonthlyMeals(params);
    await refreshData();
  };

  // Selected date's entries
  const dayEntries = summary.entries.filter((e) => e.date === selectedDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Monthly Meal & Mess Tracker
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              Postpaid Food
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track daily meals, monitor accrued monthly food dues, and settle the total bill at once
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* Tabs: Tracker vs History */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab('tracker')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'tracker'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Tracker</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Settled Bills ({pastSettlements.length})</span>
            </button>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-1 py-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-2 text-zinc-800 dark:text-zinc-200 min-w-[85px] text-center">
              {getMonthName(selectedMonth).slice(0, 3)} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'tracker' ? (
        <>
          {/* 1. Monthly Dues & Summary Metrics */}
          <MealDuesSummaryCard
            summary={summary}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onOpenSettleModal={() => setIsSettleModalOpen(true)}
          />

          {/* 2. Interactive Quick Logger */}
          <QuickMealLogger
            date={selectedDate}
            onDateChange={setSelectedDate}
            dayEntries={dayEntries}
            onAddMeal={handleAddMeal}
            onUpdateMeal={handleUpdateMeal}
            onDeleteMeal={handleDeleteMeal}
          />

          {/* 3. Daily Breakdown & Calendar Timeline */}
          <MonthlyMealCalendar
            entries={summary.entries}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onSelectDateToLog={(d) => {
              setSelectedDate(d);
              window.scrollTo({ top: 120, behavior: 'smooth' });
            }}
            onDeleteMeal={handleDeleteMeal}
            onToggleStatus={async (id, currentStatus, defaultAmount) => {
              const newStatus = currentStatus === 'eaten' ? 'skipped' : 'eaten';
              await handleUpdateMeal(id, {
                status: newStatus,
                amount: newStatus === 'eaten' ? defaultAmount : 0,
              });
            }}
          />
        </>
      ) : (
        /* Past Settlements History View */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Settled Food Bills & Receipts
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                History of monthly consolidated payments made to mess / cook
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {pastSettlements.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs">
                No settled monthly bills found yet.
              </div>
            ) : (
              pastSettlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {getMonthName(settlement.month)} {settlement.year} Mess Bill
                      </h4>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Paid on {formatDate(settlement.payment_date)} via{' '}
                        <strong className="text-zinc-700 dark:text-zinc-300">
                          {settlement.payment_method}
                        </strong>{' '}
                        ({settlement.total_meals} meals)
                      </span>
                      {settlement.notes && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 italic">
                          &quot;{settlement.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(settlement.total_amount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Settled</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pay at Once Modal */}
      <SettleDuesModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        summary={summary}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onSettle={handleSettleDues}
      />
    </div>
  );
}
