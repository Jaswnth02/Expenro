'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  PiggyBank,
  PieChart,
  BarChart3,
  Tags,
  Settings,
  PlusCircle,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Logo } from '@/components/branding/logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface SidebarProps {
  onOpenQuickAdd?: () => void;
  userEmail?: string;
  userName?: string;
}

export function Sidebar({
  onOpenQuickAdd,
  userEmail = 'alex.morgan@expenro.app',
  userName = 'Alex Morgan',
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { profile, user, signOut } = useAuth();

  const activeName = profile?.full_name || userName;
  const activeEmail = profile?.email || user?.email || userEmail;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const isDark = mounted ? (resolvedTheme === 'dark' || theme === 'dark') : true;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Expenses', href: '/expenses', icon: ArrowDownCircle },
    { label: 'Meal Tracker', href: '/meals', icon: UtensilsCrossed },
    { label: 'Income', href: '/income', icon: ArrowUpCircle },
    { label: 'Savings', href: '/savings', icon: PiggyBank },
    { label: 'Budgets', href: '/budgets', icon: PieChart },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Categories', href: '/categories', icon: Tags },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-screen sticky top-0 px-4 py-5 justify-between select-none">
      {/* Brand Header */}
      <div className="flex flex-col gap-6">
        <div className="px-2">
          <Logo showTagline size="md" />
        </div>

        {/* Global Quick Add Button */}
        <button
          onClick={onOpenQuickAdd}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm shadow-sm shadow-emerald-600/20 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Settings, Theme Switcher, User Profile */}
      <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
        {/* Settings link */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150',
            pathname === '/settings'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
          )}
        >
          <Settings className="w-4 h-4 text-zinc-400" />
          <span>Settings</span>
        </Link>

        {/* Theme Toggle & Demo indicator */}
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

        {/* User Card with Avatar */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-xs flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
              {activeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
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
            title="Sign out"
            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
