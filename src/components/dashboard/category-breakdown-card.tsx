import React from 'react';
import Link from 'next/link';
import { Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { PieChart as PieIcon } from 'lucide-react';

interface CategoryBreakdownCardProps {
  expenses: Expense[];
  totalExpenses: number;
  excludedCategories?: string[];
}

export function CategoryBreakdownCard({
  expenses,
  totalExpenses,
  excludedCategories = [],
}: CategoryBreakdownCardProps) {
  // Aggregate expenses by category name
  const categoryMap = new Map<string, { id: string; name: string; color: string; amount: number }>();

  expenses.forEach((e) => {
    const rawName = e.category?.name || 'Other';
    const catName = rawName.trim();
    const catKey = catName.toLowerCase();
    const catColor = e.category?.color || '#6B7280';

    const existing = categoryMap.get(catKey);
    if (existing) {
      existing.amount += Number(e.amount);
    } else {
      categoryMap.set(catKey, {
        id: e.category_id || catKey,
        name: catName,
        color: catColor,
        amount: Number(e.amount),
      });
    }
  });

  const categoryList = Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Spending by Category</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Monthly distribution & allocation
          </p>
        </div>
        <Link
          href="/reports"
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          View charts
        </Link>
      </div>

      {categoryList.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400">
          No category spending recorded for this month.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categoryList.slice(0, 5).map((cat) => {
            const percentage =
              totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0;

            return (
              <div key={cat.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className="text-zinc-400 text-[11px]">({percentage}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {excludedCategories.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Excluded from total:</span>
          <span className="font-medium text-amber-600 dark:text-amber-400 truncate max-w-[180px]">
            {excludedCategories.join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
