'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface MonthOption {
  month: number;
  year: number;
  label: string;
  shortLabel: string;
}

interface MonthContextType {
  selectedMonth: number;
  selectedYear: number;
  setMonth: (month: number, year: number) => void;
  shortLabel: string;
  fullLabel: string;
  monthOptions: MonthOption[];
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(() => currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(() => currentYear);

  const setMonth = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const monthOptions = useMemo<MonthOption[]>(() => {
    const list: MonthOption[] = [];
    const years = [currentYear - 1, currentYear];
    for (const y of years) {
      for (let m = 1; m <= 12; m++) {
        list.push({
          month: m,
          year: y,
          label: `${MONTH_NAMES[m - 1]} ${y}`,
          shortLabel: `${SHORT_MONTH_NAMES[m - 1]} ${y}`,
        });
      }
    }
    return list;
  }, [currentYear]);

  const shortLabel = `${SHORT_MONTH_NAMES[selectedMonth - 1] || 'Sep'} ${selectedYear}`;
  const fullLabel = `${MONTH_NAMES[selectedMonth - 1] || 'September'} ${selectedYear}`;

  return (
    <MonthContext.Provider
      value={{
        selectedMonth,
        selectedYear,
        setMonth,
        shortLabel,
        fullLabel,
        monthOptions,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    return {
      selectedMonth: m,
      selectedYear: y,
      setMonth: () => {},
      shortLabel: `${SHORT_MONTH_NAMES[m - 1]} ${y}`,
      fullLabel: `${MONTH_NAMES[m - 1]} ${y}`,
      monthOptions: [],
    };
  }
  return context;
}
