import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { FinancialInsight } from '@/types';

interface InsightsCardProps {
  insights: FinancialInsight[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const getIcon = (type: FinancialInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'tip':
        return <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
    }
  };

  const getBadgeStyle = (type: FinancialInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200';
      case 'tip':
        return 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200';
      default:
        return 'bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-900/40 text-sky-900 dark:text-sky-200';
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Smart Financial Insights
        </h2>
      </div>

      {insights.length === 0 ? (
        <p className="text-xs text-zinc-400">
          Log more income and expenses to unlock customized financial insights.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${getBadgeStyle(
                insight.type
              )}`}
            >
              {getIcon(insight.type)}
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight">{insight.title}</span>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">
                  {insight.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
