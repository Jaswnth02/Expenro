import React from 'react';
import Link from 'next/link';
import { PiggyBank, Target, ArrowRight } from 'lucide-react';
import { SavingsGoal } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface SavingsPreviewCardProps {
  goals: SavingsGoal[];
  onAddGoalClick?: () => void;
}

export function SavingsPreviewCard({
  goals,
  onAddGoalClick,
}: SavingsPreviewCardProps) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Savings Goals</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Progress toward your target milestones
          </p>
        </div>
        <Link
          href="/savings"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-2">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-zinc-500">No active savings goals</p>
          {onAddGoalClick && (
            <button
              onClick={onAddGoalClick}
              className="mt-2 text-xs text-emerald-600 font-semibold hover:underline"
            >
              + Create your first goal
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.slice(0, 3).map((goal) => {
            const saved = goal.saved_amount ?? 0;
            const progress = goal.progress_percentage ?? 0;
            const remaining = Math.max(0, goal.target_amount - saved);

            return (
              <div
                key={goal.id}
                className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {goal.name}
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {progress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>
                    Saved: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(saved)}</strong>
                  </span>
                  <span>
                    Target: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(goal.target_amount)}</strong>
                  </span>
                  <span>
                    Left: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(remaining)}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
