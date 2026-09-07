'use client';

import React, { useState, useEffect } from 'react';
import { FinanceService } from '@/lib/mongodb/data-service';
import { LocalFinanceStore } from '@/lib/data-service';
import { SavingsGoal, SavingsTransaction } from '@/types';
import { formatCurrency, formatDate, getTodayDateString } from '@/lib/utils';
import { Plus, PiggyBank, Target, Trash2, X } from 'lucide-react';

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Goal Form
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalDesc, setGoalDesc] = useState('');

  // Deposit Form
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(getTodayDateString());
  const [depositNote, setDepositNote] = useState('');

  const loadSavingsData = async () => {
    try {
      const gList = await FinanceService.getSavingsGoals();
      const tList = LocalFinanceStore.getSavingsTransactions();
      setGoals(gList);
      setTransactions(tList);
      if (gList.length > 0 && !selectedGoalId) {
        setSelectedGoalId(gList[0].id);
      }
    } catch {
      const gList = LocalFinanceStore.getSavingsGoals();
      const tList = LocalFinanceStore.getSavingsTransactions();
      setGoals(gList);
      setTransactions(tList);
      if (gList.length > 0 && !selectedGoalId) {
        setSelectedGoalId(gList[0].id);
      }
    }
  };

  useEffect(() => {
    loadSavingsData();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0 || !goalName.trim()) return;

    await FinanceService.addSavingsGoal({
      user_id: 'user-default-1',
      name: goalName.trim(),
      target_amount: target,
      target_date: targetDate || null,
      description: goalDesc.trim() || null,
    });

    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setGoalDesc('');
    setIsGoalModalOpen(false);
    await loadSavingsData();
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the goal "${name}"?`)) {
      await FinanceService.deleteSavingsGoal(id);
      await loadSavingsData();
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0 || !selectedGoalId) return;

    await FinanceService.addSavingsTransaction({
      user_id: 'user-default-1',
      goal_id: selectedGoalId,
      amount: amt,
      transaction_date: depositDate,
      note: depositNote.trim() || null,
    });

    setDepositAmount('');
    setDepositNote('');
    setIsDepositModalOpen(false);
    await loadSavingsData();
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deposit record?')) {
      await FinanceService.deleteSavingsTransaction(id);
      await loadSavingsData();
    }
  };

  const totalSavedAcrossGoals = goals.reduce((sum, g) => sum + (g.saved_amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Compact Header */}
      <div className="flex flex-col gap-1.5 pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Savings & Goals
          </h1>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer active:scale-95 shadow-2xs"
            >
              <Target className="w-3 h-3 text-indigo-500" />
              <span>+ Goal</span>
            </button>

            <button
              onClick={() => setIsDepositModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs shadow-emerald-600/20"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Add Savings</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Total Saved: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(totalSavedAcrossGoals)}</strong>
        </div>
      </div>

      {/* Savings Goals Grid */}
      {goals.length === 0 ? (
        <div className="py-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
          <p className="text-xs sm:text-sm text-zinc-400">No savings goals set yet.</p>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create your first goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {goals.map((goal) => {
            const saved = goal.saved_amount ?? 0;
            const progress = goal.progress_percentage ?? 0;
            const remaining = Math.max(0, goal.target_amount - saved);

            return (
              <div
                key={goal.id}
                className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col justify-between transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div>
                  {/* Card Header with Progress & Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <PiggyBank className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {goal.name}
                        </h3>
                        {goal.target_date && (
                          <span className="text-[10px] text-zinc-400 block truncate">
                            Target: {formatDate(goal.target_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {progress}%
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        title="Delete goal"
                        aria-label={`Delete ${goal.name}`}
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-1">
                      {goal.description}
                    </p>
                  )}

                  {/* Sleek Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden my-2.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>

                {/* 3-Column Compact Metrics */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase tracking-wider block font-semibold">Saved</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{formatCurrency(saved)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase tracking-wider block font-semibold">Target</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[9px] uppercase tracking-wider block font-semibold">Remaining</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">{formatCurrency(remaining)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Savings Deposit History */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Savings Deposit Log
          </h2>
          <span className="text-[11px] text-zinc-400 font-medium">
            {transactions.length} deposit{transactions.length === 1 ? '' : 's'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No savings deposits logged yet.
          </div>
        ) : (
          <>
            {/* Mobile Cards Feed */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 block sm:hidden">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 flex items-center justify-between gap-2.5 active:bg-zinc-50 dark:active:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
                      <PiggyBank className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {tx.goal?.name || 'Savings Goal'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        <span>{formatDate(tx.transaction_date)}</span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      title="Delete deposit"
                      className="p-1 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
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
                    <th className="py-2.5 px-4">Goal</th>
                    <th className="py-2.5 px-4">Note</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {tx.goal?.name || 'Savings Goal'}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500 dark:text-zinc-400">
                        {tx.note || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete deposit"
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

      {/* Modal: Create Goal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create New Savings Goal
              </h2>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Goal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Air, Vacation"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Target Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="60000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  placeholder="Short note on what this goal represents"
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-2xs shadow-emerald-600/20 cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Deposit */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add Savings Deposit
              </h2>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDeposit} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Target Goal *</label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (Target: {formatCurrency(g.target_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Date</label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-300">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly stipend savings allocation"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-2xs shadow-emerald-600/20 cursor-pointer"
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
