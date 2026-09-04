import { createClient } from '@/lib/supabase/client';
import {
  Expense,
  Income,
  SavingsGoal,
  SavingsTransaction,
  Budget,
  Category,
  FinancialSummary,
  UserProfile,
  RegularExpense,
  RegularExpenseInput,
  PaymentMethod,
} from '@/types';
import { getEligibleRegularExpenses as filterEligibleExpenses } from '@/lib/calculations/regular-expenses';
import { LocalFinanceStore, DEFAULT_CATEGORIES, ALLOWED_EXPENSE_CATEGORIES } from '@/lib/data-service';
import {
  calculateRemainingBalance,
  calculateSavingsRate,
  calculateGoalProgress,
  calculateBudgetUsage,
  calculateRemainingBudget,
  determineBudgetStatus,
} from '@/lib/calculations/finance';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/lib/actions/categories';
import {
  addIncomeAction,
  getIncomesAction,
  deleteIncomeAction,
} from '@/lib/actions/income';

// Helper to check if Supabase is connected and ready
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('placeholder') && !url.includes('your-project-id'));
}

export const SupabaseFinanceService = {
  // ----------------------------------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------------------------------
  async getCategories(includeAll = false): Promise<Category[]> {
    let list: Category[] = [];
    if (!isSupabaseConfigured()) {
      list = LocalFinanceStore.getCategories();
    } else {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error || !data || data.length === 0) {
          list = LocalFinanceStore.getCategories();
        } else {
          list = data as Category[];
        }
      } catch {
        list = LocalFinanceStore.getCategories();
      }
    }

    if (includeAll) {
      return list;
    }

    const allowed = new Set(ALLOWED_EXPENSE_CATEGORIES.map((n) => n.toLowerCase()));
    return list.filter(
      (c) => c.type === 'income' || allowed.has(c.name.trim().toLowerCase())
    );
  },

  async addCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    if (isSupabaseConfigured()) {
      try {
        const res = await createCategoryAction(category);
        if (res.success && res.data) {
          LocalFinanceStore.addCategory(category);
          return res.data;
        }
      } catch {}
    }
    return LocalFinanceStore.addCategory(category);
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    if (isSupabaseConfigured()) {
      try {
        const res = await updateCategoryAction(id, updates);
        if (res.success && res.data) {
          LocalFinanceStore.updateCategory(id, updates);
          return res.data;
        }
      } catch {}
    }
    const updated = LocalFinanceStore.updateCategory(id, updates);
    if (!updated) throw new Error('Category not found');
    return updated;
  },

  async deleteCategory(id: string): Promise<boolean> {
    LocalFinanceStore.deleteCategory(id);

    if (isSupabaseConfigured()) {
      try {
        const res = await deleteCategoryAction(id);
        if (res.success) {
          return true;
        }
      } catch (err) {
        console.error('Delete category action failed:', err);
      }
    }
    return true;
  },

  // ----------------------------------------------------------------------------
  // EXPENSES
  // ----------------------------------------------------------------------------
  async getExpenses(month?: number, year?: number): Promise<Expense[]> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getExpenses(month, year);
    }

    try {
      const supabase = createClient();
      let query = supabase
        .from('expenses')
        .select('*, category:categories(*)')
        .order('expense_date', { ascending: false });

      if (month !== undefined && year !== undefined) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('expense_date', startDate).lte('expense_date', endDate);
      }

      const { data, error } = await query;
      if (error || !data) {
        return LocalFinanceStore.getExpenses(month, year);
      }

      return data.map((e: any) => ({
        ...e,
        amount: Number(e.amount),
        category: e.category || null,
      })) as Expense[];
    } catch {
      return LocalFinanceStore.getExpenses(month, year);
    }
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addExpense(expense);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isUUID = (str?: string | null) =>
        str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

      let validCatId: string | null = expense.category_id || null;
      if (validCatId && !isUUID(validCatId)) {
        // Resolve from LocalFinanceStore by name
        const localCat = LocalFinanceStore.getCategories().find((c) => c.id === validCatId);
        if (localCat) {
          const { data: matched } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', localCat.name)
            .maybeSingle();

          if (matched) {
            validCatId = matched.id;
          } else {
            const { data: created } = await supabase
              .from('categories')
              .insert({
                user_id: user?.id || null,
                name: localCat.name,
                type: localCat.type,
                color: localCat.color,
                icon: localCat.icon,
              })
              .select('id')
              .maybeSingle();
            if (created) validCatId = created.id;
            else validCatId = null;
          }
        } else {
          validCatId = null;
        }
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user?.id || expense.user_id,
          category_id: validCatId,
          amount: expense.amount,
          description: expense.description,
          payment_method: expense.payment_method,
          expense_date: expense.expense_date,
          notes: expense.notes || null,
          receipt_url: expense.receipt_url || null,
        })
        .select('*, category:categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        amount: Number(data.amount),
        category: data.category || null,
      } as Expense;
    } catch {
      return LocalFinanceStore.addExpense(expense);
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.deleteExpense(id);
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch {
      return LocalFinanceStore.deleteExpense(id);
    }
  },

  // ----------------------------------------------------------------------------
  // INCOME
  // ----------------------------------------------------------------------------
  async getIncomes(month?: number, year?: number): Promise<Income[]> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getIncomes(month, year);
    }

    try {
      const supabase = createClient();
      let query = supabase
        .from('income')
        .select('*')
        .order('income_date', { ascending: false });

      if (month && year) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('income_date', startDate).lte('income_date', endDate);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((i: any) => ({
          ...i,
          amount: Number(i.amount),
        })) as Income[];
      }

      const res = await getIncomesAction(month, year);
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getIncomes(month, year);
    } catch {
      return LocalFinanceStore.getIncomes(month, year);
    }
  },

  async addIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<Income> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addIncome(income);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isUUID = (str?: string | null) =>
        str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

      const targetUserId = user?.id || (isUUID(income.user_id) ? income.user_id : null);

      if (targetUserId) {
        const { data, error } = await supabase
          .from('income')
          .insert({
            user_id: targetUserId,
            source: income.source,
            amount: Number(income.amount),
            description: income.description || null,
            income_date: income.income_date,
            notes: income.notes || null,
          })
          .select()
          .single();

        if (!error && data) {
          const formatted: Income = {
            ...data,
            amount: Number(data.amount),
          };
          LocalFinanceStore.addIncome(formatted);
          return formatted;
        }
      }

      const res = await addIncomeAction(income);
      if (res.success && res.data) {
        LocalFinanceStore.addIncome(res.data);
        return res.data;
      }
      return LocalFinanceStore.addIncome(income);
    } catch {
      return LocalFinanceStore.addIncome(income);
    }
  },

  async deleteIncome(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.deleteIncome(id);
    }

    try {
      const res = await deleteIncomeAction(id);
      if (res.success) {
        LocalFinanceStore.deleteIncome(id);
        return true;
      }
      return LocalFinanceStore.deleteIncome(id);
    } catch {
      return LocalFinanceStore.deleteIncome(id);
    }
  },

  // ----------------------------------------------------------------------------
  // SAVINGS GOALS & TRANSACTIONS
  // ----------------------------------------------------------------------------
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getSavingsGoals();
    }

    try {
      const supabase = createClient();
      const { data: goals, error: goalsError } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (goalsError || !goals) {
        return LocalFinanceStore.getSavingsGoals();
      }

      const { data: txs } = await supabase.from('savings_transactions').select('*');

      return goals.map((g: any) => {
        const goalTxs = (txs || []).filter((t: any) => t.goal_id === g.id);
        const savedAmount = goalTxs.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        const target = Number(g.target_amount);
        const progress = calculateGoalProgress(savedAmount, target);

        return {
          ...g,
          target_amount: target,
          saved_amount: savedAmount,
          progress_percentage: progress,
        } as SavingsGoal;
      });
    } catch {
      return LocalFinanceStore.getSavingsGoals();
    }
  },

  async addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>): Promise<SavingsGoal> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addSavingsGoal(goal);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user?.id || goal.user_id,
          name: goal.name,
          target_amount: goal.target_amount,
          target_date: goal.target_date || null,
          description: goal.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        target_amount: Number(data.target_amount),
        saved_amount: 0,
        progress_percentage: 0,
      } as SavingsGoal;
    } catch {
      return LocalFinanceStore.addSavingsGoal(goal);
    }
  },

  async addSavingsTransaction(
    transaction: Omit<SavingsTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SavingsTransaction> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addSavingsTransaction(transaction);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('savings_transactions')
        .insert({
          user_id: user?.id || transaction.user_id,
          goal_id: transaction.goal_id,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
          note: transaction.note || null,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        amount: Number(data.amount),
      } as SavingsTransaction;
    } catch {
      return LocalFinanceStore.addSavingsTransaction(transaction);
    }
  },

  async deleteSavingsGoal(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.deleteSavingsGoal(id);
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
      LocalFinanceStore.deleteSavingsGoal(id);
      return true;
    } catch {
      return LocalFinanceStore.deleteSavingsGoal(id);
    }
  },

  async deleteSavingsTransaction(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.deleteSavingsTransaction(id);
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('savings_transactions').delete().eq('id', id);
      if (error) throw error;
      LocalFinanceStore.deleteSavingsTransaction(id);
      return true;
    } catch {
      return LocalFinanceStore.deleteSavingsTransaction(id);
    }
  },

  // ----------------------------------------------------------------------------
  // BUDGETS
  // ----------------------------------------------------------------------------
  async getBudgets(month: number, year: number): Promise<Budget[]> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getBudgets(month, year);
    }

    try {
      const supabase = createClient();
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('month', month)
        .eq('year', year);

      if (error || !budgets) {
        return LocalFinanceStore.getBudgets(month, year);
      }

      const expenses = await this.getExpenses(month, year);

      return budgets.map((b: any) => {
        const spent = expenses
          .filter((e) => e.category_id === b.category_id)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const budgetAmount = Number(b.amount);
        const usage = calculateBudgetUsage(spent, budgetAmount);
        const remaining = calculateRemainingBudget(budgetAmount, spent);
        const status = determineBudgetStatus(spent, budgetAmount);

        return {
          ...b,
          amount: budgetAmount,
          spent_amount: spent,
          remaining_amount: remaining,
          usage_percentage: usage,
          status,
          category: b.category || null,
        } as Budget;
      });
    } catch {
      return LocalFinanceStore.getBudgets(month, year);
    }
  },

  async setBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addOrUpdateBudget(budget);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            user_id: user?.id || budget.user_id,
            category_id: budget.category_id,
            amount: budget.amount,
            month: budget.month,
            year: budget.year,
          },
          { onConflict: 'user_id,category_id,month,year' }
        )
        .select('*, category:categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        amount: Number(data.amount),
        category: data.category || null,
      } as Budget;
    } catch {
      return LocalFinanceStore.addOrUpdateBudget(budget);
    }
  },

  // ----------------------------------------------------------------------------
  // FINANCIAL SUMMARY
  // ----------------------------------------------------------------------------
  async getFinancialSummary(month: number, year: number): Promise<FinancialSummary> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getFinancialSummary(month, year);
    }

    try {
      const expenses = await this.getExpenses(month, year);
      const incomes = await this.getIncomes(month, year);

      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      let totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

      // If current month has 0 income recorded, carry forward available recent income
      // (e.g. pocket money from parents/dad transferred in the preceding weeks)
      if (totalIncome === 0) {
        const allIncomes = await this.getIncomes();
        if (allIncomes.length > 0) {
          const firstDayOfMonth = new Date(year, month - 1, 1);
          const recentCarriedIncomes = allIncomes.filter((inc) => {
            const incDate = new Date(inc.income_date);
            const diffDays = (firstDayOfMonth.getTime() - incDate.getTime()) / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays <= 45;
          });

          if (recentCarriedIncomes.length > 0) {
            totalIncome = recentCarriedIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
          } else {
            totalIncome = allIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
          }
        }
      }

      // Fetch savings deposits for this month
      const supabase = createClient();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data: savingsTxs } = await supabase
        .from('savings_transactions')
        .select('amount')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      const totalSavings = (savingsTxs || []).reduce(
        (sum: number, tx: any) => sum + Number(tx.amount),
        0
      );

      const remainingBalance = calculateRemainingBalance(totalIncome, totalExpenses);
      const savingsRate = calculateSavingsRate(totalSavings, totalIncome);

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        remainingBalance,
        savingsRate,
        month,
        year,
      };
    } catch {
      return LocalFinanceStore.getFinancialSummary(month, year);
    }
  },

  // ----------------------------------------------------------------------------
  // REGULAR EXPENSES
  // ----------------------------------------------------------------------------
  async getRegularExpensesSettings(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getRegularExpensesSettings();
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return LocalFinanceStore.getRegularExpensesSettings();

      const { data, error } = await supabase
        .from('profiles')
        .select('regular_expenses_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data || data.regular_expenses_enabled === undefined) {
        return LocalFinanceStore.getRegularExpensesSettings();
      }

      return Boolean(data.regular_expenses_enabled);
    } catch {
      return LocalFinanceStore.getRegularExpensesSettings();
    }
  },

  async setRegularExpensesSettings(enabled: boolean): Promise<boolean> {
    LocalFinanceStore.setRegularExpensesSettings(enabled);

    if (!isSupabaseConfigured()) {
      return enabled;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .update({ regular_expenses_enabled: enabled })
          .eq('id', user.id);
      }

      return enabled;
    } catch {
      return enabled;
    }
  },

  async getRegularExpenses(): Promise<RegularExpense[]> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.getRegularExpenses();
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('regular_expenses')
        .select('*, category:categories(*)')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error || !data) {
        return LocalFinanceStore.getRegularExpenses();
      }

      return data.map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        category: r.category || null,
      })) as RegularExpense[];
    } catch {
      return LocalFinanceStore.getRegularExpenses();
    }
  },

  async addRegularExpense(expense: RegularExpenseInput): Promise<RegularExpense> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.addRegularExpense(expense);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isUUID = (str?: string | null) =>
        str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) : false;

      let validCatId: string | null = expense.category_id || null;
      if (validCatId && !isUUID(validCatId)) {
        const localCat = LocalFinanceStore.getCategories().find((c) => c.id === validCatId);
        if (localCat) {
          const { data: matched } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', localCat.name)
            .maybeSingle();
          if (matched) validCatId = matched.id;
          else validCatId = null;
        } else {
          validCatId = null;
        }
      }

      const { data, error } = await supabase
        .from('regular_expenses')
        .insert({
          user_id: user?.id || expense.user_id,
          name: expense.name,
          amount: expense.amount,
          category_id: validCatId,
          icon: expense.icon || 'Tag',
          frequency: expense.frequency,
          interval_days: expense.interval_days || null,
          weekly_day: expense.weekly_day !== undefined ? expense.weekly_day : null,
          monthly_day: expense.monthly_day || null,
          start_date: expense.start_date,
          end_date: expense.end_date || null,
          display_time: expense.display_time || null,
          active: expense.active,
          display_order: expense.display_order || 0,
        })
        .select('*, category:categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        amount: Number(data.amount),
        category: data.category || null,
      } as RegularExpense;
    } catch {
      return LocalFinanceStore.addRegularExpense(expense);
    }
  },

  async updateRegularExpense(
    id: string,
    updates: Partial<RegularExpense>
  ): Promise<RegularExpense> {
    if (!isSupabaseConfigured()) {
      const updated = LocalFinanceStore.updateRegularExpense(id, updates);
      if (!updated) throw new Error('Regular expense not found');
      return updated;
    }

    try {
      const supabase = createClient();
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.category_id !== undefined) payload.category_id = updates.category_id;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.frequency !== undefined) payload.frequency = updates.frequency;
      if (updates.interval_days !== undefined) payload.interval_days = updates.interval_days;
      if (updates.weekly_day !== undefined) payload.weekly_day = updates.weekly_day;
      if (updates.monthly_day !== undefined) payload.monthly_day = updates.monthly_day;
      if (updates.start_date !== undefined) payload.start_date = updates.start_date;
      if (updates.end_date !== undefined) payload.end_date = updates.end_date;
      if (updates.display_time !== undefined) payload.display_time = updates.display_time || null;
      if (updates.active !== undefined) payload.active = updates.active;
      if (updates.display_order !== undefined) payload.display_order = updates.display_order;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('regular_expenses')
        .update(payload)
        .eq('id', id)
        .select('*, category:categories(*)')
        .single();

      if (error) throw error;
      return {
        ...data,
        amount: Number(data.amount),
        category: data.category || null,
      } as RegularExpense;
    } catch {
      const updated = LocalFinanceStore.updateRegularExpense(id, updates);
      if (!updated) throw new Error('Regular expense not found');
      return updated;
    }
  },

  async toggleRegularExpense(id: string, active?: boolean): Promise<RegularExpense> {
    const regular = (await this.getRegularExpenses()).find((r) => r.id === id);
    const newActive = active !== undefined ? active : !regular?.active;
    return this.updateRegularExpense(id, { active: newActive });
  },

  async deleteRegularExpense(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return LocalFinanceStore.deleteRegularExpense(id);
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('regular_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch {
      return LocalFinanceStore.deleteRegularExpense(id);
    }
  },

  async getEligibleRegularExpenses(
    targetDate: string,
    options?: { checkTime?: boolean; currentTime?: string }
  ): Promise<RegularExpense[]> {
    const isEnabled = await this.getRegularExpensesSettings();
    if (!isEnabled) return [];

    const all = await this.getRegularExpenses();
    return filterEligibleExpenses(all, targetDate, options);
  },

  async addSelectedRegularExpenses(
    items: { regularExpenseId: string; amount: number; description?: string }[],
    paymentMethod: PaymentMethod,
    expenseDate: string
  ): Promise<Expense[]> {
    const all = await this.getRegularExpenses();
    const regMap = new Map(all.map((r) => [r.id, r]));
    const createdExpenses: Expense[] = [];

    for (const item of items) {
      const reg = regMap.get(item.regularExpenseId);
      if (!reg) continue;

      const created = await this.addExpense({
        user_id: reg.user_id,
        category_id: reg.category_id,
        amount: item.amount,
        description: item.description?.trim() || reg.name,
        payment_method: paymentMethod,
        expense_date: expenseDate,
        notes: null,
        receipt_url: null,
      });
      createdExpenses.push(created);
    }

    return createdExpenses;
  },
};
