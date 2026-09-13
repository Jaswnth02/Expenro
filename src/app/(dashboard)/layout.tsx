'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { QuickAddModal } from '@/components/layout/quick-add-modal';
import { Logo } from '@/components/branding/logo';
import { openMobileDrawer } from '@/lib/nav-preferences';
import { MonthProvider } from '@/context/month-context';
import { MobileTopMonthSelector } from '@/components/layout/mobile-top-month-selector';
import { ContextualAddProvider } from '@/context/contextual-add-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'regular' | 'manual'>('manual');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenQuickAdd = (mode: 'regular' | 'manual' = 'manual') => {
    setQuickAddMode(mode);
    setIsQuickAddOpen(true);
  };

  const handleExpenseAdded = () => {
    // Increment refresh key to signal child pages to re-fetch/re-render data
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <MonthProvider>
      <ContextualAddProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-row w-full max-w-full overflow-x-hidden">
        {/* Desktop Left Sidebar */}
        <Sidebar onOpenQuickAdd={() => handleOpenQuickAdd('manual')} />

        {/* Main Content Scroll Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-8 w-full max-w-full overflow-x-hidden">
          {/* Universal Sticky Top Bar (Common for all pages across Mobile & Desktop) */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-3.5 sm:px-6 lg:px-8 py-2.5 bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xl select-none">
            {/* Mobile Drawer Trigger & Logo */}
            <div className="flex md:hidden items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={openMobileDrawer}
                aria-label="Open navigation menu"
                className="p-1.5 -ml-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Logo size="sm" showTagline={false} />
            </div>

            {/* Desktop Brand Context */}
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Expenro
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Finance Tracker
              </span>
            </div>

            {/* Universal Top Month Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <MobileTopMonthSelector />
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 max-w-7xl w-full mx-auto min-w-0">
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<any>, {
                  refreshKey,
                  onOpenQuickAdd: handleOpenQuickAdd,
                })
              : children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNav onOpenQuickAdd={() => handleOpenQuickAdd('manual')} />

        {/* Global Quick Add Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          initialMode={quickAddMode}
          onClose={() => setIsQuickAddOpen(false)}
          onExpenseAdded={handleExpenseAdded}
        />
      </div>
      </ContextualAddProvider>
    </MonthProvider>
  );
}
