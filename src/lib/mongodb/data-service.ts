import {
  Expense,
  Income,
  SavingsGoal,
  SavingsTransaction,
  Budget,
  Category,
  FinancialSummary,
  RegularExpense,
  PaymentMethod,
  MealEntry,
  MealSettlement,
  MonthlyMealSummary,
} from '@/types';
import { LocalFinanceStore, ALLOWED_EXPENSE_CATEGORIES } from '@/lib/data-service';
import { calculateSavingsRate } from '@/lib/calculations/finance';
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/lib/actions/categories';
import {
  getIncomesAction,
  addIncomeAction,
  updateIncomeAction,
  deleteIncomeAction,
  calibrateWalletBalanceAction,
} from '@/lib/actions/income';
import {
  getExpensesAction,
  addExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from '@/lib/actions/expenses';
import {
  getSavingsGoalsAction,
  addSavingsGoalAction,
  updateSavingsGoalAction,
  deleteSavingsGoalAction,
  addSavingsTransactionAction,
  deleteSavingsTransactionAction,
  getSavingsTransactionsAction,
} from '@/lib/actions/savings';
import {
  getBudgetsAction,
  setBudgetAction,
  deleteBudgetAction,
} from '@/lib/actions/budgets';
import {
  getRegularExpenses,
  createRegularExpense,
  updateRegularExpense,
  toggleRegularExpense,
  deleteRegularExpense,
  getEligibleRegularExpenses,
  addSelectedRegularExpenses,
} from '@/lib/actions/regular-expenses';
import {
  getMealEntriesAction,
  addMealEntryAction,
  updateMealEntryAction,
  deleteMealEntryAction,
  getMealSettlementsAction,
  settleMonthlyMealsAction,
  getMonthlyMealSummaryAction,
} from '@/lib/actions/meals';
import { updateUserProfileAction, getCurrentUserProfileAction } from '@/lib/actions/auth';

function isMongoConfigured(): boolean {
  return true;
}

export const FinanceService = {
  // ----------------------------------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------------------------------
  async getCategories(includeAll = false): Promise<Category[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getCategories();
    }

    try {
      const res = await getCategoriesAction();
      if (res.success && res.data && res.data.length > 0) {
        if (!includeAll) {
          const filtered = res.data.filter(
            (c) => c.type === 'income' || ALLOWED_EXPENSE_CATEGORIES.includes(c.name)
          );
          return filtered.length > 0 ? filtered : res.data;
        }
        return res.data;
      }
      return LocalFinanceStore.getCategories();
    } catch {
      return LocalFinanceStore.getCategories();
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    try {
      const res = await createCategoryAction(category);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addCategory(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to create category in MongoDB');
    } catch (err) {
      console.error('[FinanceService] createCategory error:', err);
      throw err;
    }
  },

  async addCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    return this.createCategory(category);
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    try {
      const res = await updateCategoryAction(id, updates);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.updateCategory(id, res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to update category in MongoDB');
    } catch (err) {
      console.error('[FinanceService] updateCategory error:', err);
      throw err;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const res = await deleteCategoryAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteCategory(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete category from MongoDB');
    } catch (err) {
      console.error('[FinanceService] deleteCategory error:', err);
      throw err;
    }
  },

  // ----------------------------------------------------------------------------
  // EXPENSES
  // ----------------------------------------------------------------------------
  async getExpenses(month?: number, year?: number): Promise<Expense[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getExpenses(month, year);
    }

    try {
      const res = await getExpensesAction(month, year);
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getExpenses(month, year);
    } catch {
      return LocalFinanceStore.getExpenses(month, year);
    }
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    try {
      const res = await addExpenseAction(expense);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addExpense(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save expense to MongoDB');
    } catch (err) {
      console.error('[FinanceService] addExpense error:', err);
      throw err;
    }
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    try {
      const res = await updateExpenseAction(id, updates);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.updateExpense(id, res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to update expense in MongoDB');
    } catch (err) {
      console.error('[FinanceService] updateExpense error:', err);
      throw err;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const res = await deleteExpenseAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteExpense(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete expense from MongoDB');
    } catch (err) {
      console.error('[FinanceService] deleteExpense error:', err);
      throw err;
    }
  },

  // ----------------------------------------------------------------------------
  // INCOME
  // ----------------------------------------------------------------------------
  async getIncomes(month?: number, year?: number): Promise<Income[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getIncomes(month, year);
    }

    try {
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
    try {
      const res = await addIncomeAction(income);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addIncome(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save income to MongoDB');
    } catch (err) {
      console.error('[FinanceService] addIncome error:', err);
      throw err;
    }
  },

  async updateIncome(id: string, updates: Partial<Income>): Promise<Income> {
    try {
      const res = await updateIncomeAction(id, updates);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.updateIncome(id, res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to update income in MongoDB');
    } catch (err) {
      console.error('[FinanceService] updateIncome error:', err);
      throw err;
    }
  },

  async deleteIncome(id: string): Promise<boolean> {
    try {
      const res = await deleteIncomeAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteIncome(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete income from MongoDB');
    } catch (err) {
      console.error('[FinanceService] deleteIncome error:', err);
      throw err;
    }
  },

  // ----------------------------------------------------------------------------
  // SAVINGS
  // ----------------------------------------------------------------------------
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getSavingsGoals();
    }

    try {
      const res = await getSavingsGoalsAction();
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getSavingsGoals();
    } catch {
      return LocalFinanceStore.getSavingsGoals();
    }
  },

  async addSavingsGoal(
    goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at' | 'saved_amount' | 'progress_percentage'>
  ): Promise<SavingsGoal> {
    try {
      const res = await addSavingsGoalAction(goal);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addSavingsGoal(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save savings goal to MongoDB');
    } catch (err) {
      console.error('[FinanceService] addSavingsGoal error:', err);
      throw err;
    }
  },

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> {
    try {
      const res = await updateSavingsGoalAction(id, updates);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error || 'Failed to update savings goal');
    } catch (err) {
      console.error('[FinanceService] updateSavingsGoal error:', err);
      throw err;
    }
  },

  async deleteSavingsGoal(id: string): Promise<boolean> {
    try {
      const res = await deleteSavingsGoalAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteSavingsGoal(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete savings goal');
    } catch (err) {
      console.error('[FinanceService] deleteSavingsGoal error:', err);
      throw err;
    }
  },

  async addSavingsTransaction(
    transaction: Omit<SavingsTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SavingsTransaction> {
    try {
      const res = await addSavingsTransactionAction(transaction);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addSavingsTransaction(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save savings transaction to MongoDB');
    } catch (err) {
      console.error('[FinanceService] addSavingsTransaction error:', err);
      throw err;
    }
  },

  async deleteSavingsTransaction(id: string): Promise<boolean> {
    try {
      const res = await deleteSavingsTransactionAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteSavingsTransaction(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete savings transaction');
    } catch (err) {
      console.error('[FinanceService] deleteSavingsTransaction error:', err);
      throw err;
    }
  },

  async getSavingsTransactions(goalId?: string): Promise<SavingsTransaction[]> {
    try {
      const res = await getSavingsTransactionsAction(goalId);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    const list = LocalFinanceStore.getSavingsTransactions();
    return goalId ? list.filter((t) => t.goal_id === goalId) : list;
  },

  // ----------------------------------------------------------------------------
  // BUDGETS
  // ----------------------------------------------------------------------------
  async getBudgets(month: number, year: number): Promise<Budget[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getBudgets(month, year);
    }

    try {
      const res = await getBudgetsAction(month, year);
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getBudgets(month, year);
    } catch {
      return LocalFinanceStore.getBudgets(month, year);
    }
  },

  async setBudget(
    categoryId: string,
    amount: number,
    month: number,
    year: number
  ): Promise<Budget> {
    try {
      const res = await setBudgetAction(categoryId, amount, month, year);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addOrUpdateBudget({
            user_id: res.data.user_id,
            category_id: categoryId,
            amount,
            month,
            year,
          });
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save budget in MongoDB');
    } catch (err) {
      console.error('[FinanceService] setBudget error:', err);
      throw err;
    }
  },

  async deleteBudget(id: string): Promise<boolean> {
    try {
      const res = await deleteBudgetAction(id);
      return res.success;
    } catch {
      return true;
    }
  },

  // ----------------------------------------------------------------------------
  // REGULAR EXPENSES
  // ----------------------------------------------------------------------------
  async getRegularExpenses(): Promise<RegularExpense[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getRegularExpenses();
    }

    try {
      const res = await getRegularExpenses();
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getRegularExpenses();
    } catch {
      return LocalFinanceStore.getRegularExpenses();
    }
  },

  async createRegularExpense(input: unknown): Promise<RegularExpense> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.addRegularExpense(input as any);
    }

    try {
      const res = await createRegularExpense(input);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return LocalFinanceStore.addRegularExpense(input as any);
  },

  async addRegularExpense(input: unknown): Promise<RegularExpense> {
    return this.createRegularExpense(input);
  },

  async updateRegularExpense(id: string, updates: unknown): Promise<RegularExpense> {
    if (!isMongoConfigured()) {
      const updated = LocalFinanceStore.updateRegularExpense(id, updates as any);
      if (!updated) throw new Error('Regular expense not found');
      return updated;
    }

    try {
      const res = await updateRegularExpense(id, updates);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    const fallback = LocalFinanceStore.updateRegularExpense(id, updates as any);
    if (!fallback) throw new Error('Regular expense not found');
    return fallback;
  },

  async toggleRegularExpense(id: string, active?: boolean): Promise<RegularExpense> {
    if (!isMongoConfigured()) {
      const updated = LocalFinanceStore.toggleRegularExpense(id, active);
      if (!updated) throw new Error('Regular expense not found');
      return updated;
    }

    try {
      const res = await toggleRegularExpense(id, active);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    const fallback = LocalFinanceStore.toggleRegularExpense(id, active);
    if (!fallback) throw new Error('Regular expense not found');
    return fallback;
  },

  async deleteRegularExpense(id: string): Promise<boolean> {
    LocalFinanceStore.deleteRegularExpense(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteRegularExpense(id);
      return res.success;
    } catch {
      return true;
    }
  },

  async getEligibleRegularExpenses(
    targetDate: string,
    options?: { checkTime?: boolean; currentTime?: string }
  ): Promise<RegularExpense[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getEligibleRegularExpenses(targetDate, options);
    }

    try {
      const res = await getEligibleRegularExpenses(targetDate, options);
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getEligibleRegularExpenses(targetDate, options);
    } catch {
      return LocalFinanceStore.getEligibleRegularExpenses(targetDate, options);
    }
  },

  async addSelectedRegularExpenses(
    items: { regularExpenseId: string; amount: number; description?: string }[],
    paymentMethod: PaymentMethod,
    expenseDate: string
  ): Promise<number> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.addSelectedRegularExpenses(items, paymentMethod, expenseDate).length;
    }

    try {
      const res = await addSelectedRegularExpenses(items, paymentMethod, expenseDate);
      if (res.success && res.data !== undefined) {
        return res.data;
      }
    } catch {}
    return LocalFinanceStore.addSelectedRegularExpenses(items, paymentMethod, expenseDate).length;
  },

  async getRegularExpensesSettings(): Promise<boolean> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getRegularExpensesSettings();
    }

    try {
      const profile = await getCurrentUserProfileAction();
      if (profile && profile.regular_expenses_enabled !== undefined) {
        return profile.regular_expenses_enabled;
      }
      return LocalFinanceStore.getRegularExpensesSettings();
    } catch {
      return LocalFinanceStore.getRegularExpensesSettings();
    }
  },

  async updateRegularExpensesSettings(enabled: boolean): Promise<boolean> {
    LocalFinanceStore.setRegularExpensesSettings(enabled);
    if (!isMongoConfigured()) return enabled;

    try {
      await updateUserProfileAction({ regular_expenses_enabled: enabled });
      return enabled;
    } catch {
      return enabled;
    }
  },

  async setRegularExpensesSettings(enabled: boolean): Promise<boolean> {
    return this.updateRegularExpensesSettings(enabled);
  },

  // ----------------------------------------------------------------------------
  // MEAL TRACKER
  // ----------------------------------------------------------------------------
  async getMealEntries(month?: number, year?: number): Promise<MealEntry[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getMealEntries(month, year);
    }

    try {
      const res = await getMealEntriesAction(month, year);
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getMealEntries(month, year);
    } catch {
      return LocalFinanceStore.getMealEntries(month, year);
    }
  },

  async addMealEntry(entry: Omit<MealEntry, 'id' | 'created_at' | 'updated_at'>): Promise<MealEntry> {
    try {
      const res = await addMealEntryAction(entry);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.addMealEntry(res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to save meal entry in MongoDB');
    } catch (err) {
      console.error('[FinanceService] addMealEntry error:', err);
      throw err;
    }
  },

  async updateMealEntry(id: string, updates: Partial<MealEntry>): Promise<MealEntry> {
    try {
      const res = await updateMealEntryAction(id, updates);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.updateMealEntry(id, res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to update meal entry in MongoDB');
    } catch (err) {
      console.error('[FinanceService] updateMealEntry error:', err);
      throw err;
    }
  },

  async deleteMealEntry(id: string): Promise<boolean> {
    try {
      const res = await deleteMealEntryAction(id);
      if (res.success) {
        try {
          LocalFinanceStore.deleteMealEntry(id);
        } catch {}
        return true;
      }
      throw new Error(res.error || 'Failed to delete meal entry from MongoDB');
    } catch (err) {
      console.error('[FinanceService] deleteMealEntry error:', err);
      throw err;
    }
  },

  async getMealSettlements(): Promise<MealSettlement[]> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getMealSettlements();
    }

    try {
      const res = await getMealSettlementsAction();
      if (res.success && res.data) {
        return res.data;
      }
      return LocalFinanceStore.getMealSettlements();
    } catch {
      return LocalFinanceStore.getMealSettlements();
    }
  },

  async settleMonthlyMeals(params: {
    month: number;
    year: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    createExpense?: boolean;
    notes?: string;
  }): Promise<{ settlement: MealSettlement; expense?: Expense }> {
    const local = LocalFinanceStore.settleMonthlyMeals(params);
    if (!isMongoConfigured()) return local;

    try {
      const res = await settleMonthlyMealsAction(params);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return local;
  },

  async getMonthlyMealSummary(month: number, year: number): Promise<MonthlyMealSummary> {
    try {
      const res = await getMonthlyMealSummaryAction(month, year);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return LocalFinanceStore.getMonthlyMealSummary(month, year);
  },

  // ----------------------------------------------------------------------------
  // FINANCIAL SUMMARY & WALLET CALIBRATION
  // ----------------------------------------------------------------------------
  getLowBalanceThreshold(): number {
    return LocalFinanceStore.getLowBalanceThreshold();
  },

  setLowBalanceThreshold(amount: number): number {
    return LocalFinanceStore.setLowBalanceThreshold(amount);
  },

  async calibrateWalletBalance(
    targetBalance: number,
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear()
  ): Promise<Income> {
    try {
      const res = await calibrateWalletBalanceAction(targetBalance, month, year);
      if (res.success && res.data) {
        try {
          LocalFinanceStore.calibrateWalletBalance(targetBalance);
          LocalFinanceStore.updateIncome(res.data.id, res.data);
        } catch {}
        return res.data;
      }
      throw new Error(res.error || 'Failed to calibrate wallet balance in MongoDB');
    } catch (err) {
      console.error('[FinanceService] calibrateWalletBalance error:', err);
      throw err;
    }
  },

  async getFinancialSummary(month: number, year: number): Promise<FinancialSummary> {
    if (!isMongoConfigured()) {
      return LocalFinanceStore.getFinancialSummary(month, year);
    }

    try {
      const [allIncomes, allExpenses, goals] = await Promise.all([
        this.getIncomes(),
        this.getExpenses(),
        this.getSavingsGoals(),
      ]);

      const monthStr = String(month).padStart(2, '0');
      const monthlyIncomes = allIncomes.filter((i) => i.income_date.startsWith(`${year}-${monthStr}`));
      const monthlyExpenses = allExpenses.filter((e) => e.expense_date.startsWith(`${year}-${monthStr}`));

      const totalIncome = monthlyIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalSavings = goals.reduce((sum, g) => sum + (g.saved_amount || 0), 0);

      const allTimeIncome = allIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      const allTimeExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const allTimeSavings = totalSavings;

      const availableBalance = Number((allTimeIncome - allTimeExpenses - allTimeSavings).toFixed(2));
      const lowBalanceThreshold = this.getLowBalanceThreshold();
      const isLowBalance = availableBalance < lowBalanceThreshold;

      const sortedIncomes = [...allIncomes].sort(
        (a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime()
      );
      const lastIncome =
        sortedIncomes.length > 0
          ? {
              amount: Number(sortedIncomes[0].amount),
              source: sortedIncomes[0].source,
              income_date: sortedIncomes[0].income_date,
              description: sortedIncomes[0].description,
            }
          : null;

      const savingsRate = calculateSavingsRate(
        totalSavings,
        totalIncome > 0 ? totalIncome : allTimeIncome > 0 ? allTimeIncome : 0
      );

      return {
        totalIncome,
        totalExpenses,
        totalSavings,
        remainingBalance: availableBalance,
        availableBalance,
        allTimeIncome,
        allTimeExpenses,
        allTimeSavings,
        isLowBalance,
        lowBalanceThreshold,
        lastIncome,
        savingsRate,
        month,
        year,
      };
    } catch {
      return LocalFinanceStore.getFinancialSummary(month, year);
    }
  },
};

// Backwards-compatibility alias so existing components don't immediately crash
export const SupabaseFinanceService = FinanceService;
