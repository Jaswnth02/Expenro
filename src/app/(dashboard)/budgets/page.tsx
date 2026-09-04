'use client';

import React, { useState, useEffect } from 'react';
import { LocalFinanceStore } from '@/lib/data-service';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';
import { Budget } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, PieChart, AlertTriangle, CheckCircle, ShieldAlert, X } from 'lucide-react';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const loadBudgets = () => {
    setBudgets(LocalFinanceStore.getBudgets(9, 2026));
  };

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadBudgets();
    const init = async () => {
      const cats = await SupabaseFinanceService.getCategories();
      const expenseCats = cats.filter((c) => c.type === 'expense');
      setCategories(expenseCats);
      if (expenseCats.length > 0 && !categoryId) {
        setCategoryId(expenseCats[0].id);
      }
    };
    init();
  }, []);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || !categoryId) return;

    LocalFinanceStore.addOrUpdateBudget({
      user_id: 'user-default-1',
      category_id: categoryId,
      amount: num,
      month: 9,
      year: 2026,
    });

    setAmount('');
    setIsModalOpen(false);
    loadBudgets();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Monthly Budgets
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            September 2026 • Set spending limits and monitor category thresholds
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Set Budget</span>
        </button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((b) => {
          const spent = b.spent_amount ?? 0;
          const usage = b.usage_percentage ?? 0;
          const remaining = b.remaining_amount ?? 0;

          // Three states: normal (<80%), near_limit (80-100%), exceeded (>100%)
          let statusBadge = (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3 h-3" />
              <span>Normal ({usage}%)</span>
            </span>
          );
          let barColor = 'bg-emerald-500';

          if (b.status === 'exceeded') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                <ShieldAlert className="w-3 h-3" />
                <span>Exceeded by {formatCurrency(Math.abs(remaining))}</span>
              </span>
            );
            barColor = 'bg-rose-500';
          } else if (b.status === 'near_limit') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" />
                <span>Near Limit ({usage}%)</span>
              </span>
            );
            barColor = 'bg-amber-500';
          }

          return (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: b.category?.color || '#10B981' }}
                    />
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {b.category?.name || 'Category'}
                    </h2>
                  </div>
                  {statusBadge}
                </div>

                <div className="flex items-baseline justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>
                    Spent: <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(spent)}</strong>
                  </span>
                  <span>
                    Budget: <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(b.amount)}</strong>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden my-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(100, usage)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 text-xs flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-zinc-500">Remaining Allowance:</span>
                <span
                  className={`font-bold ${
                    remaining < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {remaining < 0
                    ? `-${formatCurrency(Math.abs(remaining))}`
                    : formatCurrency(remaining)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-xl p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto flex flex-col">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden shrink-0" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Set Category Budget
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Monthly Budget Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
