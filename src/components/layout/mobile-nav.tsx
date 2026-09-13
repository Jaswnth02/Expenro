'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownCircle,
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
  PiggyBank,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/branding/logo';
import { useAuth } from '@/context/auth-context';
import { useCustomNavTabs, CUSTOM_NAV_TAB_OPTIONS } from '@/lib/nav-preferences';
import { useContextualAdd } from '@/context/contextual-add-context';

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
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { profile, user, signOut } = useAuth();
  const [customTabs] = useCustomNavTabs();

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

  // Listen for global drawer open event (e.g. from top hamburger button)
  useEffect(() => {
    const handleOpenDrawer = () => setIsDrawerOpen(true);
    window.addEventListener('expenro:open-mobile-drawer', handleOpenDrawer);
    return () => window.removeEventListener('expenro:open-mobile-drawer', handleOpenDrawer);
  }, []);

  // Automatically close drawer on route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  const isHomeActive = pathname === '/dashboard';
  const isExpensesActive = pathname.startsWith('/expenses');

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : true;

  // Configuration for the 2 user-selected custom tabs
  const [firstTabId, secondTabId] = customTabs;
  const firstTab = CUSTOM_NAV_TAB_OPTIONS[firstTabId] || CUSTOM_NAV_TAB_OPTIONS.savings;
  const secondTab = CUSTOM_NAV_TAB_OPTIONS[secondTabId] || CUSTOM_NAV_TAB_OPTIONS.meals;

  const FirstIcon = firstTab.icon;
  const SecondIcon = secondTab.icon;

  const isFirstActive = pathname.startsWith(firstTab.href);
  const isSecondActive = pathname.startsWith(secondTab.href);

  // Full app navigation links inside the Left Slide-out Menu
  const allNavLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Expenses', href: '/expenses', icon: ArrowDownCircle, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/50' },
    { label: 'Meal Tracker', href: '/meals', icon: UtensilsCrossed, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
    { label: 'Income', href: '/income', icon: ArrowUpCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Savings', href: '/savings', icon: PiggyBank, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' },
    { label: 'Budgets', href: '/budgets', icon: PieChart, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
    { label: 'Categories', href: '/categories', icon: Tags, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/50' },
    { label: 'Reports', href: '/reports', icon: BarChart3, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/50' },
    { label: 'Settings', href: '/settings', icon: Settings, color: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800' },
  ];

  const { triggerAdd } = useContextualAdd();

  const handleAddClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    triggerAdd(pathname, onOpenQuickAdd);
  };

  const getAddAriaLabel = () => {
    if (pathname.startsWith('/savings')) return 'Add Savings Deposit';
    if (pathname.startsWith('/income')) return 'Add Income';
    if (pathname.startsWith('/meals')) return 'Log Meal';
    if (pathname.startsWith('/budgets')) return 'Set Category Budget';
    if (pathname.startsWith('/categories')) return 'Add Category';
    if (pathname.startsWith('/expenses')) return 'Add Expense';
    return 'Quick Add';
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-1 sm:px-2 py-1.5 pb-safe select-none shadow-lg shadow-black/5 w-full max-w-full overflow-visible">
        <div className="flex items-center justify-around w-full max-w-md mx-auto overflow-visible">
          {/* 1. Home */}
          <Link
            href="/dashboard"
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-medium transition-colors active:scale-95 min-w-0',
              isHomeActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="truncate">Home</span>
          </Link>

          {/* 2. Expenses */}
          <Link
            href="/expenses"
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-medium transition-colors active:scale-95 min-w-0',
              isExpensesActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <ArrowDownCircle className="w-5 h-5" />
            <span className="truncate">Expenses</span>
          </Link>

          {/* 3. Floating Quick Add (+) Button (Center) - Works contextually based on active page */}
          <button
            type="button"
            id="mobile-nav-center-add-btn"
            onClick={handleAddClick}
            aria-label={getAddAriaLabel()}
            className="flex flex-col items-center -mt-7 relative z-50 p-1 cursor-pointer touch-manipulation active:scale-95 transition-transform focus:outline-none"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 border-4 border-white dark:border-zinc-950 pointer-events-none">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mt-0.5 pointer-events-none">
              Add
            </span>
          </button>

          {/* 4. Custom Tab 1 (User Configurable via Settings) */}
          <Link
            href={firstTab.href}
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-medium transition-colors active:scale-95 min-w-0',
              isFirstActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <FirstIcon className="w-5 h-5" />
            <span className="truncate">{firstTab.shortLabel}</span>
          </Link>

          {/* 5. Custom Tab 2 (User Configurable via Settings) */}
          <Link
            href={secondTab.href}
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[11px] font-medium transition-colors active:scale-95 min-w-0',
              isSecondActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <SecondIcon className="w-5 h-5" />
            <span className="truncate">{secondTab.shortLabel}</span>
          </Link>
        </div>
      </nav>

      {/* Left Slide-out Menu Drawer ("More" moved here) */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Left Drawer Container */}
          <div className="w-[82%] max-w-[320px] h-full bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800 shadow-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-250 z-10">
            {/* Top Brand & Close Button */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <Logo size="sm" showTagline />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items List */}
              <nav className="flex flex-col gap-1 py-1">
                {allNavLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-98',
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', item.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Section: Theme & Account */}
            <div className="flex flex-col gap-3 pt-3 mt-4 border-t border-zinc-100 dark:border-zinc-900">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-medium">Theme</span>
                </div>
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label="Toggle Theme"
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {mounted && !isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </div>

              {/* User Profile & Sign Out */}
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
                    {activeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {activeName}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      {activeEmail}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Backdrop Tap Area to close */}
          <div
            className="flex-1 h-full cursor-pointer"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close drawer backdrop"
          />
        </div>
      )}
    </>
  );
}
