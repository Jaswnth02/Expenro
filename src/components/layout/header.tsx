'use client';

import React from 'react';
import { ChevronDown, Calendar, Bell } from 'lucide-react';
import { Logo } from '@/components/branding/logo';
import { getGreeting } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface HeaderProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  userName?: string;
}

export function Header({
  selectedMonth,
  selectedYear,
  onMonthChange,
  userName = 'Alex',
}: HeaderProps) {
  const { profile } = useAuth();
  const displayName = profile?.full_name ? profile.full_name.split(' ')[0] : userName;
  const greeting = getGreeting();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [m, y] = e.target.value.split('-').map(Number);
    onMonthChange(m, y);
  };

  // Selectable months
  const monthOptions = [
    { month: 1, year: 2026, label: 'January 2026' },
    { month: 2, year: 2026, label: 'February 2026' },
    { month: 3, year: 2026, label: 'March 2026' },
    { month: 4, year: 2026, label: 'April 2026' },
    { month: 5, year: 2026, label: 'May 2026' },
    { month: 6, year: 2026, label: 'June 2026' },
    { month: 7, year: 2026, label: 'July 2026' },
    { month: 8, year: 2026, label: 'August 2026' },
    { month: 9, year: 2026, label: 'September 2026' },
    { month: 10, year: 2026, label: 'October 2026' },
    { month: 11, year: 2026, label: 'November 2026' },
    { month: 12, year: 2026, label: 'December 2026' },
  ];

  return (
    <header className="flex flex-col gap-2 pb-2.5 pt-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
      {/* Mobile Top Bar: Logo on left, Bell & Profile Avatar on right */}
      <div className="flex md:hidden items-center justify-between w-full">
        <Logo size="sm" showTagline={false} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative p-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Greeting & Compact Month Selector Row */}
      <div className="flex items-center justify-between gap-2.5 w-full">
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
          <span className="truncate">{greeting}, {displayName}</span>
          <span className="text-base shrink-0">👋</span>
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Month Selector Dropdown */}
          <div className="relative inline-flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={`${selectedMonth}-${selectedYear}`}
              onChange={handleSelectChange}
              aria-label="Select Overview Month"
              className="appearance-none pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 sm:py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer transition-colors"
            >
              {monthOptions.map((opt) => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2 pointer-events-none text-zinc-400 dark:text-zinc-500">
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>

          {/* Notification Button on Desktop */}
          <button
            type="button"
            aria-label="Notifications"
            className="hidden md:flex relative p-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </button>
        </div>
      </div>
    </header>
  );
}
