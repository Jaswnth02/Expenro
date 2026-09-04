'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { LocalFinanceStore } from '@/lib/data-service';
import {
  User,
  SlidersHorizontal,
  Moon,
  Sun,
  Laptop,
  Download,
  RotateCcw,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { RegularExpenseList } from '@/components/regular-expenses/regular-expense-list';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex.morgan@expenro.app');
  const [currency, setCurrency] = useState('INR');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (user?.email || profile?.email) {
      setEmail(user?.email || profile?.email || 'alex.morgan@expenro.app');
    }
  }, [user, profile]);

  const currentTheme = mounted ? theme : 'system';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Profile settings saved successfully.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data back to the clean seed state?')) {
      LocalFinanceStore.resetToSeed();
      setMessage('Sample data has been re-initialized.');
      setTimeout(() => {
        setMessage(null);
        window.location.reload();
      }, 1000);
    }
  };

  const handleExportCSV = () => {
    const expenses = LocalFinanceStore.getExpenses();
    const headers = ['ID', 'Date', 'Category', 'Description', 'Payment Method', 'Amount'];
    const rows = expenses.map((e) => [
      e.id,
      e.expense_date,
      e.category?.name || 'Other',
      `"${e.description.replace(/"/g, '""')}"`,
      e.payment_method,
      e.amount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expenro_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setMessage('Expenses CSV downloaded.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 max-w-4xl">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
            Settings & Preferences
          </h1>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
            Profile, display preferences, regular expenses & data
          </p>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Row 1: Profile & Preferences in a neat 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
        {/* Card 1: Profile Information */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Profile Information
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-2">
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Card 2: App Preferences (Currency + Theme combined) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                App Preferences
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Currency Selector */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-0.5 flex items-center justify-between">
                  <span>Preferred Currency</span>
                  <span className="text-[10px] text-zinc-400">Formatting default</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="INR">₹ INR (Indian Rupee - Default)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                </select>
              </div>

              {/* Theme Mode Segmented Control */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentTheme === 'light'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentTheme === 'dark'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentTheme === 'system'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-emerald-500" />
                    <span>System</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Regular Expenses */}
      <div id="regular-expenses">
        <RegularExpenseList />
      </div>

      {/* Row 3: Data Management & Export (Single Compact Line) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Data & Backup
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Export your financial records to CSV or restore default sample data.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs transition-colors hover:opacity-90 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
