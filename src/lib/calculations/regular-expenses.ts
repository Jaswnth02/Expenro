import { RegularExpense } from '@/types';

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

/**
 * Parses YYYY-MM-DD into a UTC midnight timestamp to guarantee
 * zero timezone shifts and daylight savings distortion.
 */
export function parseDateUTC(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * Checks if targetDate is within startDate and optional endDate.
 */
export function isWithinDateRange(
  startDate: string,
  endDate: string | null | undefined,
  targetDate: string
): boolean {
  if (targetDate < startDate) return false;
  if (endDate && targetDate > endDate) return false;
  return true;
}

/**
 * Daily: Eligible every single day within configured range.
 */
export function isDailyEligible(
  startDate: string,
  endDate: string | null | undefined,
  targetDate: string
): boolean {
  return isWithinDateRange(startDate, endDate, targetDate);
}

/**
 * Every X Days: Calculated from start_date with integer day modulo logic.
 * E.g. Start Sep 1, Every 3 Days -> Sep 1, Sep 4, Sep 7, Sep 10...
 */
export function isIntervalEligible(
  startDate: string,
  endDate: string | null | undefined,
  targetDate: string,
  intervalDays: number
): boolean {
  if (intervalDays <= 0) return false;
  if (!isWithinDateRange(startDate, endDate, targetDate)) return false;

  const startMs = parseDateUTC(startDate);
  const targetMs = parseDateUTC(targetDate);
  const diffDays = Math.round((targetMs - startMs) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return false;
  return diffDays % intervalDays === 0;
}

/**
 * Weekly: Eligible on the specified day of the week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 */
export function isWeeklyEligible(
  startDate: string,
  endDate: string | null | undefined,
  targetDate: string,
  weeklyDay: number
): boolean {
  if (!isWithinDateRange(startDate, endDate, targetDate)) return false;

  const targetUtc = new Date(parseDateUTC(targetDate));
  return targetUtc.getUTCDay() === weeklyDay;
}

/**
 * Monthly: Eligible on the specified day of the month (1-31).
 * Handles shorter months safely by clamping to the last day of the month
 * (e.g. 31st becomes Feb 28/29, Apr 30).
 */
export function isMonthlyEligible(
  startDate: string,
  endDate: string | null | undefined,
  targetDate: string,
  monthlyDay: number
): boolean {
  if (!isWithinDateRange(startDate, endDate, targetDate)) return false;

  const [year, month, day] = targetDate.split('-').map(Number);
  // Last day of this month
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDay = Math.min(monthlyDay, daysInMonth);

  return day === effectiveDay;
}

/**
 * Current local time formatted as HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format 'HH:mm' or 'HH:mm:ss' to 'h:mm AM/PM' (e.g. '08:00' -> '8:00 AM')
 */
export function formatTime12Hour(timeStr?: string | null): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.slice(0, 5).split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${ampm}`;
}

/**
 * Checks if an expense's scheduled display time has arrived on targetDate.
 */
export function isTimeEligible(
  displayTime?: string | null,
  targetDate?: string,
  currentTime?: string
): boolean {
  if (!displayTime || displayTime.trim() === '') return true;
  if (!targetDate) return true;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Past dates bypass the time-of-day check
  if (targetDate < today) return true;
  // Future dates are not due right now
  if (targetDate > today) return false;

  // For today, check if current local time >= displayTime
  const timeNow = currentTime || getCurrentTimeString();
  return timeNow >= displayTime.slice(0, 5);
}

/**
 * Main eligibility predicate for any regular expense on a given date.
 */
export function isRegularExpenseEligible(
  expense: RegularExpense,
  targetDate: string,
  options?: { checkTime?: boolean; currentTime?: string }
): boolean {
  if (!expense.active) return false;

  if (options?.checkTime) {
    if (!isTimeEligible(expense.display_time, targetDate, options.currentTime)) {
      return false;
    }
  }

  switch (expense.frequency) {
    case 'daily':
      return isDailyEligible(expense.start_date, expense.end_date, targetDate);

    case 'interval_days':
      return isIntervalEligible(
        expense.start_date,
        expense.end_date,
        targetDate,
        expense.interval_days || 1
      );

    case 'weekly':
      return isWeeklyEligible(
        expense.start_date,
        expense.end_date,
        targetDate,
        expense.weekly_day ?? 1
      );

    case 'monthly':
      return isMonthlyEligible(
        expense.start_date,
        expense.end_date,
        targetDate,
        expense.monthly_day ?? 1
      );

    default:
      return false;
  }
}

/**
 * Filter an array of regular expenses to those eligible on targetDate,
 * ordered by display_order then name.
 */
export function getEligibleRegularExpenses(
  expenses: RegularExpense[],
  targetDate: string,
  options?: { checkTime?: boolean; currentTime?: string }
): RegularExpense[] {
  return expenses
    .filter((e) => isRegularExpenseEligible(e, targetDate, options))
    .sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * Human friendly frequency label
 */
export function formatFrequencyDescription(
  expense: Pick<RegularExpense, 'frequency' | 'interval_days' | 'weekly_day' | 'monthly_day'>
): string {
  switch (expense.frequency) {
    case 'daily':
      return 'Daily';
    case 'interval_days':
      return expense.interval_days === 1
        ? 'Every Day'
        : `Every ${expense.interval_days} Days`;
    case 'weekly': {
      const match = WEEKDAYS.find((w) => w.value === expense.weekly_day);
      return `Every ${match ? match.label : 'Monday'}`;
    }
    case 'monthly': {
      const day = expense.monthly_day || 1;
      const suffix =
        day === 1 || day === 21 || day === 31
          ? 'st'
          : day === 2 || day === 22
          ? 'nd'
          : day === 3 || day === 23
          ? 'rd'
          : 'th';
      return `Monthly (${day}${suffix})`;
    }
    default:
      return 'Custom';
  }
}
