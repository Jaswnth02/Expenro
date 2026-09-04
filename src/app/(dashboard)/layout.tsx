'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { QuickAddModal } from '@/components/layout/quick-add-modal';

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-row">
      {/* Desktop Left Sidebar */}
      <Sidebar onOpenQuickAdd={() => handleOpenQuickAdd('manual')} />

      {/* Main Content Scroll Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-8">
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto">
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
  );
}
