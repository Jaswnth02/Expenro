'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SupabaseFinanceService } from '@/lib/supabase/data-service';

interface SetBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess: () => void;
}

export function SetBalanceModal({
  isOpen,
  onClose,
  currentBalance,
  onSuccess,
}: SetBalanceModalProps) {
  const [targetAmount, setTargetAmount] = useState<string>('2000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
      if (currentBalance > 0) {
        setTargetAmount(currentBalance.toString());
      } else {
        setTargetAmount('2000');
      }
    }
  }, [isOpen, currentBalance]);

  if (!isOpen) return null;

  const presets = [500, 1000, 2000, 5000, 10000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetAmount);
    if (isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid balance (₹0 or greater)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await SupabaseFinanceService.calibrateWalletBalance(parsed);
      await Promise.resolve(onSuccess());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 mb-3 sm:hidden" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Wallet className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Set Current Wallet Balance
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Calibrate to match your real bank account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status explanation */}
        <div className="p-3 mb-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs flex items-center justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Current App Calculation:</span>
          <span
            className={`font-bold ${
              currentBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(currentBalance)}
          </span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
          Since past expenses were tracked without income top-ups, enter the exact amount you currently have in your bank or cash right now. Expenro will set an opening balance so your available funds match reality.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 block">
              Actual Current Balance (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                disabled={isSubmitting}
                placeholder="2000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] text-zinc-400 mr-1">Presets:</span>
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setTargetAmount(amt.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                    targetAmount === amt.toString()
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/60 hover:bg-zinc-200/60'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 rounded-xl shadow-2xs shadow-teal-600/20 cursor-pointer transition-all min-w-[125px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calibrating...</span>
                </>
              ) : (
                'Set Real Balance'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

