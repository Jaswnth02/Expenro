-- ==============================================================================
-- EXPENRO — Database Schema & Row Level Security (RLS)
-- Production PostgreSQL Schema for Supabase
-- Brand: EXPENRO (Track. Spend. Save.)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- System categories have user_id = NULL, custom categories have user_id = auth.uid()
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT DEFAULT '#10B981',
  icon TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. EXPENSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. INCOME TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. SAVINGS GOALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. SAVINGS TRANSACTIONS TABLE
-- Savings are tracked separately from regular expenses to prevent double counting
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. BUDGETS TABLE
-- Monthly category budgets. Constraint ensures only 1 budget per user+cat+month+year
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_category_budget_period UNIQUE (user_id, category_id, month, year)
);

-- ------------------------------------------------------------------------------
-- 8. RECURRING EXPENSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON public.income(user_id, income_date);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_goal ON public.savings_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_expenses(user_id);

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories: users can view system categories (user_id IS NULL) or their own
CREATE POLICY "Users can view system or own categories" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses: user strict isolation
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Income: user strict isolation
CREATE POLICY "Users can view own income" ON public.income
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON public.income
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON public.income
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON public.income
  FOR DELETE USING (auth.uid() = user_id);

-- Savings Goals: user strict isolation
CREATE POLICY "Users can view own savings goals" ON public.savings_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings goals" ON public.savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings goals" ON public.savings_goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings goals" ON public.savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Savings Transactions: user strict isolation
CREATE POLICY "Users can view own savings transactions" ON public.savings_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings transactions" ON public.savings_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings transactions" ON public.savings_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings transactions" ON public.savings_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets: user strict isolation
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Recurring Expenses: user strict isolation
CREATE POLICY "Users can view own recurring expenses" ON public.recurring_expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring expenses" ON public.recurring_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring expenses" ON public.recurring_expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring expenses" ON public.recurring_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. USER REGISTRATION TRIGGER
-- Automatically creates a profile record when a user signs up via Supabase Auth
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, currency)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'INR'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 12. DEFAULT SYSTEM CATEGORIES SEED
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
  (NULL, 'Food', 'expense', '#F59E0B', 'utensils'),
  (NULL, 'Transport', 'expense', '#3B82F6', 'car'),
  (NULL, 'Shopping', 'expense', '#EC4899', 'shopping-bag'),
  (NULL, 'Entertainment', 'expense', '#8B5CF6', 'film'),
  (NULL, 'Bills', 'expense', '#EF4444', 'receipt'),
  (NULL, 'Education', 'expense', '#10B981', 'book-open'),
  (NULL, 'Health', 'expense', '#14B8A6', 'activity'),
  (NULL, 'Rent', 'expense', '#6366F1', 'home'),
  (NULL, 'Technology', 'expense', '#06B6D4', 'laptop'),
  (NULL, 'Travel', 'expense', '#F97316', 'plane'),
  (NULL, 'Other', 'expense', '#6B7280', 'more-horizontal'),
  -- Income categories
  (NULL, 'Salary', 'income', '#10B981', 'briefcase'),
  (NULL, 'Internship', 'income', '#3B82F6', 'award'),
  (NULL, 'Freelancing', 'income', '#8B5CF6', 'laptop'),
  (NULL, 'Pocket Money', 'income', '#F59E0B', 'wallet'),
  (NULL, 'Scholarship', 'income', '#06B6D4', 'graduation-cap'),
  (NULL, 'Other', 'income', '#6B7280', 'dollar-sign')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 13. REGULAR EXPENSES TABLE & PREFERENCES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS regular_expenses_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.regular_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT DEFAULT 'tag',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'interval_days', 'weekly', 'monthly')),
  interval_days INTEGER CHECK (interval_days IS NULL OR interval_days > 0),
  weekly_day INTEGER CHECK (weekly_day IS NULL OR (weekly_day >= 0 AND weekly_day <= 6)),
  monthly_day INTEGER CHECK (monthly_day IS NULL OR (monthly_day >= 1 AND monthly_day <= 31)),
  start_date DATE NOT NULL,
  end_date DATE,
  display_time TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_end_date_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT check_interval_positive CHECK (frequency != 'interval_days' OR (interval_days IS NOT NULL AND interval_days > 0)),
  CONSTRAINT check_weekly_valid CHECK (frequency != 'weekly' OR (weekly_day IS NOT NULL AND weekly_day >= 0 AND weekly_day <= 6)),
  CONSTRAINT check_monthly_valid CHECK (frequency != 'monthly' OR (monthly_day IS NOT NULL AND monthly_day >= 1 AND monthly_day <= 31))
);

CREATE INDEX IF NOT EXISTS idx_regular_expenses_user ON public.regular_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_regular_expenses_active ON public.regular_expenses(user_id, active);
CREATE INDEX IF NOT EXISTS idx_regular_expenses_dates ON public.regular_expenses(user_id, start_date, end_date);

ALTER TABLE public.regular_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own regular expenses" ON public.regular_expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own regular expenses" ON public.regular_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own regular expenses" ON public.regular_expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own regular expenses" ON public.regular_expenses
  FOR DELETE USING (auth.uid() = user_id);

