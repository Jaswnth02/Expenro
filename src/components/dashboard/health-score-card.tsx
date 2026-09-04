import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { FinancialHealthScore } from '@/types';

interface HealthScoreCardProps {
  healthScore: FinancialHealthScore;
}

export function HealthScoreCard({ healthScore }: HealthScoreCardProps) {
  const getRatingBadge = (rating: FinancialHealthScore['rating']) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-500 text-white';
      case 'Good':
        return 'bg-teal-500 text-white';
      case 'Fair':
        return 'bg-amber-500 text-white';
      case 'Poor':
        return 'bg-rose-500 text-white';
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 text-white p-5 shadow-md border border-zinc-800 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Financial Health Score
          </span>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getRatingBadge(
            healthScore.rating
          )}`}
        >
          {healthScore.rating}
        </span>
      </div>

      <div className="my-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-white">
          {healthScore.score}
        </span>
        <span className="text-sm font-semibold text-zinc-400">/ 100</span>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed">
        {healthScore.explanation}
      </p>

      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automated Health Metric</span>
        </span>
        <span>Track. Spend. Save.</span>
      </div>
    </div>
  );
}
