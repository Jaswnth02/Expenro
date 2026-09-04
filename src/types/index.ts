export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  currency: CurrencyCode;
  regular_expenses_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  user_id: string | null; // null for system/default categories
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  created_at: string;
}

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Debit Card'
  | 'Credit Card'
  | 'Bank Transfer'
  | 'Other';

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  category?: Category;
  amount: number;
  description: string;
  payment_method: PaymentMethod;
  expense_date: string; // YYYY-MM-DD
  notes?: string | null;
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type IncomeSource =
  | 'Salary'
  | 'Internship'
  | 'Freelancing'
  | 'Pocket Money'
  | 'Scholarship'
  | 'Other';

export interface Income {
  id: string;
  user_id: string;
  source: IncomeSource | string;
  amount: number;
  description?: string | null;
  income_date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  // Derived client/query attributes:
  saved_amount?: number;
  progress_percentage?: number;
}

export interface SavingsTransaction {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  transaction_date: string; // YYYY-MM-DD
  note?: string | null;
  created_at: string;
  updated_at: string;
  goal?: SavingsGoal;
}

export type BudgetStatus = 'normal' | 'near_limit' | 'exceeded';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category?: Category;
  amount: number;
  month: number; // 1-12
  year: number;
  created_at: string;
  updated_at: string;
  // Derived attributes:
  spent_amount?: number;
  remaining_amount?: number;
  usage_percentage?: number;
  status?: BudgetStatus;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id?: string | null;
  category?: Category;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type RegularFrequency = 'daily' | 'interval_days' | 'weekly' | 'monthly';

export interface RegularExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category_id: string | null;
  category?: Category;
  icon?: string | null;
  frequency: RegularFrequency;
  interval_days?: number | null;
  weekly_day?: number | null; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  monthly_day?: number | null; // 1-31
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  display_time?: string | null; // HH:mm (e.g. '08:00', '13:30')
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type RegularExpenseInput = Omit<
  RegularExpense,
  'id' | 'created_at' | 'updated_at' | 'category'
>;

export interface RegularExpenseChecklistItem {
  regularExpense: RegularExpense;
  selected: boolean;
  customAmount: number; // Configured amount by default, editable for specific transaction
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  remainingBalance: number;
  savingsRate: number;
  month: number;
  year: number;
  previousMonthComparison?: {
    incomeChangePct: number;
    expenseChangePct: number;
    savingsChangePct: number;
  };
}

export interface FinancialHealthScore {
  score: number; // 0 - 100
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  explanation: string;
  factors: {
    name: string;
    score: number;
    description: string;
  }[];
}

export interface FinancialInsight {
  id: string;
  type: 'info' | 'success' | 'warning' | 'tip';
  title: string;
  message: string;
}
