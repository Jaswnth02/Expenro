-- ==============================================================================
-- EXPENRO — Meal & Mess Food Tracker Migration
-- Adds tables for tracking daily meals, running monthly dues, and pay-at-once settlements
-- ==============================================================================

-- 1. MEAL SETTLEMENTS TABLE (for recording monthly consolidated settlements)
CREATE TABLE IF NOT EXISTS public.meal_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_meals INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. MEAL ENTRIES TABLE (for recording individual daily meals)
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'custom')),
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'eaten' CHECK (status IN ('eaten', 'skipped')),
  notes TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settlement_id UUID REFERENCES public.meal_settlements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON public.meal_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_entries_settled ON public.meal_entries(user_id, is_settled);
CREATE INDEX IF NOT EXISTS idx_meal_settlements_user_period ON public.meal_settlements(user_id, month, year);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_settlements ENABLE ROW LEVEL SECURITY;

-- meal_entries RLS
CREATE POLICY "Users can view own meal entries" ON public.meal_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal entries" ON public.meal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal entries" ON public.meal_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal entries" ON public.meal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- meal_settlements RLS
CREATE POLICY "Users can view own meal settlements" ON public.meal_settlements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal settlements" ON public.meal_settlements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal settlements" ON public.meal_settlements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal settlements" ON public.meal_settlements
  FOR DELETE USING (auth.uid() = user_id);
