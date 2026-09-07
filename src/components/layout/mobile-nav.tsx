'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownCircle,
  PiggyBank,
  MoreHorizontal,
  Plus,
  ArrowUpCircle,
  PieChart,
  BarChart3,
  Tags,
  Settings,
  Sun,
  Moon,
  X,
  LogOut,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/branding/logo';
import { useAuth } from '@/context/auth-context';

interface MobileNavProps {
  onOpenQuickAdd: () => void;
  userEmail?: string;
  userName?: string;
}

export function MobileNav({
  onOpenQuickAdd,
  userEmail = 'alex.morgan@expenro.app',
  userName = 'Alex Morgan',
}: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { profile, user, signOut } = useAuth();

  const activeName = profile?.full_name || userName;
  const activeEmail = profile?.email || user?.email || userEmail;

  const handleSignOut = async () => {
    setIsDrawerOpen(false);
    await signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatically close drawer on route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const isHomeActive = pathname === '/dashboard';
  const isExpensesActive = pathname.startsWith('/expenses');
  const isSavingsActive = pathname.startsWith('/savings');
  const isMoreActive =
    pathname.startsWith('/meals') ||
    pathname.startsWith('/income') ||
    pathname.startsWith('/budgets') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/settings');

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : true;

  const moreNavLinks = [
    { label: 'Meal Tracker', href: '/meals', icon: UtensilsCrossed, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Income', href: '/income', icon: ArrowUpCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Budgets', href: '/budgets', icon: PieChart, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
    { label: 'Categories', href: '/categories', icon: Tags, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Reports', href: '/reports', icon: BarChart3, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50' },
    { label: 'Settings', href: '/settings', icon: Settings, color: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 py-1.5 pb-safe select-none shadow-lg shadow-black/5">
        <div className="flex items-center justify-around">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors active:scale-95',
              isHomeActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Home</span>
          </Link>

          {/* 2. Expenses */}
          <Link
            href="/expenses"
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors active:scale-95',
              isExpensesActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <ArrowDownCircle className="w-5 h-5" />
            <span>Expenses</span>
          </Link>

          {/* 3. Floating Quick Add (+) Button */}
          <div className="flex flex-col items-center -mt-6">
            <button
              type="button"
              onClick={onOpenQuickAdd}
              aria-label="Quick Add Expense"
              className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 border-4 border-white dark:border-zinc-950 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mt-0.5">
              Add
            </span>
          </div>

          {/* 4. Savings */}
          <Link
            href="/savings"
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors active:scale-95',
              isSavingsActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <PiggyBank className="w-5 h-5" />
            <span>Savings</span>
          </Link>

          {/* 5. More (Opens Mobile Sheet Drawer) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="More Navigation"
            className={cn(
              'relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[11px] font-medium transition-colors active:scale-95 cursor-pointer',
              isMoreActive || isDrawerOpen
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
            {isMoreActive && (
              <span className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay & Sheet */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop tap to close */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Bottom Sheet Modal */}
          <div className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl shadow-2xl p-5 pb-safe animate-in slide-in-from-bottom duration-250 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto -mt-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <Logo size="sm" showTagline={false} />
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {moreNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-98',
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs'
                        : 'bg-zinc-50/70 dark:bg-zinc-950/50 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.color)}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Theme Toggle & Actions */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Theme Mode
                  </div>
                  <div className="text-[11px] text-zinc-400 capitalize">
                    Currently {isDark ? 'Dark' : 'Light'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-transform"
              >
                {mounted && !isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
              </button>
            </div>

            {/* User Profile & Sign Out */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
                  {activeName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeName}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {activeEmail}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
