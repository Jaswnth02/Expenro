-- ==============================================================================
-- EXPENRO — Regular Expenses Migration
-- Brand: EXPENRO (Track. Spend. Save.)
-- ==============================================================================

-- 1. ADD REGULAR EXPENSES ENABLED PREFERENCE TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS regular_expenses_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. CREATE REGULAR EXPENSES TABLE
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

-- 3. INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_regular_expenses_user ON public.regular_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_regular_expenses_active ON public.regular_expenses(user_id, active);
CREATE INDEX IF NOT EXISTS idx_regular_expenses_dates ON public.regular_expenses(user_id, start_date, end_date);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.regular_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own regular expenses" ON public.regular_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own regular expenses" ON public.regular_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own regular expenses" ON public.regular_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own regular expenses" ON public.regular_expenses
  FOR DELETE USING (auth.uid() = user_id);
