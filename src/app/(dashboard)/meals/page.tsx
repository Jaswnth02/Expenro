'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Receipt,
  CheckCircle2,
  History,
  Plus,
  X,
  Coffee,
  Sun,
  Moon,
} from 'lucide-react';
import { MealDuesSummaryCard } from '@/components/meals/meal-dues-summary-card';
import { QuickMealLogger } from '@/components/meals/quick-meal-logger';
import { MonthlyMealCalendar } from '@/components/meals/monthly-meal-calendar';
import { SettleDuesModal } from '@/components/meals/settle-dues-modal';
import { FinanceService } from '@/lib/mongodb/data-service';
import { useContextualAdd } from '@/context/contextual-add-context';
import { useMonth } from '@/context/month-context';
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
  const { selectedMonth, selectedYear } = useMonth();
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

  // Add Meal Modal Form State
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [modalMealType, setModalMealType] = useState<MealType>('lunch');
  const [modalMealName, setModalMealName] = useState('Lunch');
  const [modalMealAmount, setModalMealAmount] = useState('80');
  const [modalMealDate, setModalMealDate] = useState(today);
  const [modalMealStatus, setModalMealStatus] = useState<MealStatus>('eaten');
  const [modalMealNotes, setModalMealNotes] = useState('');

  const { registerAddHandler } = useContextualAdd();

  // Contextual Add listener: when bottom mobile "+" button is tapped on /meals, open Log Meal modal
  useEffect(() => {
    const unregister = registerAddHandler('meals', () => {
      setModalMealType('lunch');
      setModalMealName('Lunch');
      setModalMealAmount('80');
      setModalMealDate(selectedDate || today);
      setModalMealStatus('eaten');
      setModalMealNotes('');
      setIsAddMealModalOpen(true);
    });

    const handleWindowEvent = () => {
      setModalMealType('lunch');
      setModalMealName('Lunch');
      setModalMealAmount('80');
      setModalMealDate(selectedDate || today);
      setModalMealStatus('eaten');
      setModalMealNotes('');
      setIsAddMealModalOpen(true);
    };
    window.addEventListener('expenro:trigger-add', handleWindowEvent);

    return () => {
      unregister();
      window.removeEventListener('expenro:trigger-add', handleWindowEvent);
    };
  }, [selectedDate, today, registerAddHandler]);

  const refreshData = useCallback(async () => {
    try {
      const [sum, settlements] = await Promise.all([
        FinanceService.getMonthlyMealSummary(selectedMonth, selectedYear),
        FinanceService.getMealSettlements(),
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
      FinanceService.getMonthlyMealSummary(selectedMonth, selectedYear),
      FinanceService.getMealSettlements(),
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



  // Add meal
  const handleAddMeal = async (entry: {
    meal_type: MealType;
    name: string;
    amount: number;
    status: MealStatus;
    notes?: string;
    date?: string;
  }) => {
    await FinanceService.addMealEntry({
      user_id: 'user-default-1',
      date: entry.date || selectedDate,
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

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(modalMealAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    await handleAddMeal({
      meal_type: modalMealType,
      name:
        modalMealName.trim() ||
        (modalMealType === 'breakfast'
          ? 'Breakfast'
          : modalMealType === 'lunch'
          ? 'Lunch'
          : modalMealType === 'dinner'
          ? 'Dinner'
          : 'Custom Item'),
      amount: parsedAmount,
      status: modalMealStatus,
      notes: modalMealNotes.trim() || undefined,
      date: modalMealDate,
    });

    setIsAddMealModalOpen(false);
  };

  // Update meal
  const handleUpdateMeal = async (id: string, updates: Partial<MealEntry>) => {
    await FinanceService.updateMealEntry(id, updates);
    await refreshData();
  };

  // Delete meal
  const handleDeleteMeal = async (id: string) => {
    await FinanceService.deleteMealEntry(id);
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
    await FinanceService.settleMonthlyMeals(params);
    await refreshData();
  };

  // Selected date's entries
  const dayEntries = summary.entries.filter((e) => e.date === selectedDate);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Monthly Meal Tracker
          </h1>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Log Meal Button */}
          <button
            onClick={() => {
              setModalMealType('lunch');
              setModalMealName('Lunch');
              setModalMealAmount('80');
              setModalMealDate(selectedDate || today);
              setModalMealStatus('eaten');
              setModalMealNotes('');
              setIsAddMealModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Log Meal</span>
          </button>

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

      {/* Modal: Log Daily Meal (Triggered by bottom mobile Add button on /meals) */}
      {isAddMealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Log Meal
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Record breakfast, lunch, dinner, or custom extras
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMealModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="flex flex-col gap-3">
              {/* Meal Type Quick Selector */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 block">
                  Select Meal Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { type: 'breakfast' as const, label: 'Breakfast', icon: Coffee, price: '50' },
                    { type: 'lunch' as const, label: 'Lunch', icon: Sun, price: '80' },
                    { type: 'dinner' as const, label: 'Dinner', icon: Moon, price: '50' },
                    { type: 'custom' as const, label: 'Custom', icon: Plus, price: '40' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = modalMealType === m.type;
                    return (
                      <button
                        key={m.type}
                        type="button"
                        onClick={() => {
                          setModalMealType(m.type);
                          if (m.type !== 'custom') {
                            setModalMealName(m.label);
                            setModalMealAmount(m.price);
                          } else {
                            setModalMealName('');
                            setModalMealAmount('40');
                          }
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer',
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal Name / Description */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1 block">
                  Meal Description
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalMealType === 'custom' ? 'e.g. Samosa & Tea, Juice' : 'e.g. Mess Thali'}
                  value={modalMealName}
                  onChange={(e) => setModalMealName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1 block">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={modalMealAmount}
                    onChange={(e) => setModalMealAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1 block">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={modalMealDate}
                    onChange={(e) => setModalMealDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Status (Eaten vs Skipped) */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1 block">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMealStatus('eaten');
                      if (parseFloat(modalMealAmount) === 0) {
                        setModalMealAmount(modalMealType === 'lunch' ? '80' : '50');
                      }
                    }}
                    className={cn(
                      'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                      modalMealStatus === 'eaten'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <span>✓ Eaten</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMealStatus('skipped');
                      setModalMealAmount('0');
                    }}
                    className={cn(
                      'py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all',
                      modalMealStatus === 'skipped'
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 text-zinc-900 dark:text-zinc-100 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    <span>✕ Skipped (₹0)</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddMealModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-2xs shadow-emerald-600/20 cursor-pointer active:scale-98"
                >
                  Log Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
