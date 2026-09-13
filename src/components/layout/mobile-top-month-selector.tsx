'use client';

import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useMonth } from '@/context/month-context';

export function MobileTopMonthSelector() {
  const { selectedMonth, selectedYear, setMonth, monthOptions, shortLabel } = useMonth();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [m, y] = e.target.value.split('-').map(Number);
    if (!isNaN(m) && !isNaN(y)) {
      setMonth(m, y);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <div className="absolute left-2 pointer-events-none text-zinc-400 dark:text-zinc-500">
        <Calendar className="w-3.5 h-3.5" />
      </div>

      <select
        value={`${selectedMonth}-${selectedYear}`}
        onChange={handleSelectChange}
        aria-label="Select Active Month"
        className="appearance-none pl-6.5 pr-6 py-1 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer transition-colors"
      >
        {monthOptions.map((opt) => (
          <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
            {opt.shortLabel}
          </option>
        ))}
      </select>

      <div className="absolute right-1.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
        <ChevronDown className="w-3 h-3" />
      </div>
    </div>
  );
}
