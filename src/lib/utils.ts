import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CurrencyCode } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'INR'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(numericAmount)) return `${CURRENCY_SYMBOLS[currency]}0`;

  const symbol = CURRENCY_SYMBOLS[currency] || '₹';

  if (currency === 'INR') {
    // Format Indian Numbering System (e.g. 1,50,000)
    return `${symbol}${numericAmount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
    })}`;
  }

  return `${symbol}${numericAmount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
  })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || '';
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
