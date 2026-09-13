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
    <header className="flex flex-col gap-2 pb-2.5 pt-1 border-b border-zinc-200/60 dark:border-zinc-800/60 w-full max-w-full min-w-0 overflow-hidden">
      {/* Main Greeting Row */}
      <div className="flex items-center justify-between gap-2 w-full min-w-0">
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 min-w-0 truncate">
          <span className="truncate">{greeting}, {displayName}</span>
          <span className="text-base shrink-0">👋</span>
        </h1>
      </div>
    </header>
  );
}
