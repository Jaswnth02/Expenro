'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { PaymentMethod, MonthlyMealSummary } from '@/types';
import { formatCurrency, getMonthName, getTodayDateString, cn } from '@/lib/utils';

interface SettleDuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MonthlyMealSummary;
  selectedMonth: number;
  selectedYear: number;
  onSettle: (params: {
    month: number;
    year: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    createExpense: boolean;
    notes?: string;
  }) => Promise<void>;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Other',
];

export function SettleDuesModal({
  isOpen,
  onClose,
  summary,
  selectedMonth,
  selectedYear,
  onSettle,
}: SettleDuesModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [createExpense, setCreateExpense] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const monthName = getMonthName(selectedMonth);
  const totalAmount = summary.totalUnpaidDues;
  const unsettledMealsCount = summary.entries.filter(
    (e) => e.status === 'eaten' && !e.is_settled
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      setError('No unpaid dues to settle for this month.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSettle({
        month: selectedMonth,
        year: selectedYear,
        paymentMethod,
        paymentDate,
        createExpense,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to settle dues. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Pay Month&apos;s Bill at Once
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {monthName} {selectedYear} Food Bill Settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="p-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Total Amount to Pay
            </span>
            <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Across <strong className="text-zinc-800 dark:text-zinc-200">{unsettledMealsCount}</strong> unsettled meals this month
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Payment Method Used
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'py-2 px-2.5 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer',
                      paymentMethod === method
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold ring-1 ring-emerald-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Add to Expenro Expenses Option */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createExpense}
                  onChange={(e) => setCreateExpense(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Record as Expense in Expenro
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5 leading-relaxed">
                    Creates a single expense under &apos;Mess Food&apos; for {formatCurrency(totalAmount)} on {paymentDate}, keeping your total wallet balance and budget reports accurate.
                  </span>
                </div>
              </label>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Settlement Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via UPI to canteen manager"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalAmount <= 0}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer',
                  isSubmitting || totalAmount <= 0
                    ? 'bg-zinc-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording...' : `Confirm & Pay ${formatCurrency(totalAmount)}`}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
