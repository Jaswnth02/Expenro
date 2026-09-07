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
    const local = LocalFinanceStore.addCategory(category);
    if (!isMongoConfigured()) return local;

    try {
      const res = await createCategoryAction(category);
      if (res.success && res.data) {
        LocalFinanceStore.updateCategory(local.id, res.data);
        return res.data;
      }
    } catch {}
    return local;
  },

  async addCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    return this.createCategory(category);
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    LocalFinanceStore.updateCategory(id, updates);
    if (!isMongoConfigured()) {
      const updated = LocalFinanceStore.getCategories().find((c) => c.id === id);
      if (!updated) throw new Error('Category not found');
      return updated;
    }

    try {
      const res = await updateCategoryAction(id, updates);
      if (res.success && res.data) {
        LocalFinanceStore.updateCategory(id, res.data);
        return res.data;
      }
    } catch {}
    const fallback = LocalFinanceStore.getCategories().find((c) => c.id === id);
    if (!fallback) throw new Error('Category not found');
    return fallback;
  },

  async deleteCategory(id: string): Promise<boolean> {
    LocalFinanceStore.deleteCategory(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteCategoryAction(id);
      return res.success;
    } catch {
      return true;
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
    const local = LocalFinanceStore.addExpense(expense);
    if (!isMongoConfigured()) return local;

    try {
      const res = await addExpenseAction(expense);
      if (res.success && res.data) {
        LocalFinanceStore.updateExpense(local.id, res.data);
        return res.data;
      }
    } catch {}
    return local;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const local = LocalFinanceStore.updateExpense(id, updates);
    if (!isMongoConfigured()) {
      if (!local) throw new Error('Expense not found');
      return local;
    }

    try {
      const res = await updateExpenseAction(id, updates);
      if (res.success && res.data) {
        LocalFinanceStore.updateExpense(id, res.data);
        return res.data;
      }
    } catch {}
    if (!local) throw new Error('Expense not found');
    return local;
  },

  async deleteExpense(id: string): Promise<boolean> {
    LocalFinanceStore.deleteExpense(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteExpenseAction(id);
      return res.success;
    } catch {
      return true;
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
    const local = LocalFinanceStore.addIncome(income);
    if (!isMongoConfigured()) return local;

    try {
      const res = await addIncomeAction(income);
      if (res.success && res.data) {
        LocalFinanceStore.updateIncome(local.id, res.data);
        return res.data;
      }
    } catch {}
    return local;
  },

  async updateIncome(id: string, updates: Partial<Income>): Promise<Income> {
    const local = LocalFinanceStore.updateIncome(id, updates);
    if (!isMongoConfigured()) {
      if (!local) throw new Error('Income record not found');
      return local;
    }

    try {
      const res = await updateIncomeAction(id, updates);
      if (res.success && res.data) {
        LocalFinanceStore.updateIncome(id, res.data);
        return res.data;
      }
    } catch {}
    if (!local) throw new Error('Income record not found');
    return local;
  },

  async deleteIncome(id: string): Promise<boolean> {
    LocalFinanceStore.deleteIncome(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteIncomeAction(id);
      return res.success;
    } catch {
      return true;
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
    const local = LocalFinanceStore.addSavingsGoal(goal);
    if (!isMongoConfigured()) return local;

    try {
      const res = await addSavingsGoalAction(goal);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return local;
  },

  async updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> {
    try {
      const res = await updateSavingsGoalAction(id, updates);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    const goals = LocalFinanceStore.getSavingsGoals();
    const found = goals.find((g) => g.id === id);
    if (!found) throw new Error('Savings goal not found');
    Object.assign(found, updates);
    return found;
  },

  async deleteSavingsGoal(id: string): Promise<boolean> {
    LocalFinanceStore.deleteSavingsGoal(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteSavingsGoalAction(id);
      return res.success;
    } catch {
      return true;
    }
  },

  async addSavingsTransaction(
    transaction: Omit<SavingsTransaction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SavingsTransaction> {
    const local = LocalFinanceStore.addSavingsTransaction(transaction);
    if (!isMongoConfigured()) return local;

    try {
      const res = await addSavingsTransactionAction(transaction);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return local;
  },

  async deleteSavingsTransaction(id: string): Promise<boolean> {
    LocalFinanceStore.deleteSavingsTransaction(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteSavingsTransactionAction(id);
      return res.success;
    } catch {
      return true;
    }
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
    const local = LocalFinanceStore.addOrUpdateBudget({
      user_id: 'user-default-1',
      category_id: categoryId,
      amount,
      month,
      year,
    });
    if (!isMongoConfigured()) return local;

    try {
      const res = await setBudgetAction(categoryId, amount, month, year);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return local;
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
    const local = LocalFinanceStore.addMealEntry(entry);
    if (!isMongoConfigured()) return local;

    try {
      const res = await addMealEntryAction(entry);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return local;
  },

  async updateMealEntry(id: string, updates: Partial<MealEntry>): Promise<MealEntry> {
    const local = LocalFinanceStore.updateMealEntry(id, updates);
    if (!isMongoConfigured()) {
      if (!local) throw new Error('Meal entry not found');
      return local;
    }

    try {
      const res = await updateMealEntryAction(id, updates);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    if (!local) throw new Error('Meal entry not found');
    return local;
  },

  async deleteMealEntry(id: string): Promise<boolean> {
    LocalFinanceStore.deleteMealEntry(id);
    if (!isMongoConfigured()) return true;

    try {
      const res = await deleteMealEntryAction(id);
      return res.success;
    } catch {
      return true;
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

  async calibrateWalletBalance(targetBalance: number, month = 9, year = 2026): Promise<Income> {
    const localOptimistic = LocalFinanceStore.calibrateWalletBalance(targetBalance);
    if (!isMongoConfigured()) return localOptimistic;

    try {
      const res = await calibrateWalletBalanceAction(targetBalance, month, year);
      if (res.success && res.data) {
        LocalFinanceStore.updateIncome(res.data.id, res.data);
        return res.data;
      }
    } catch {}
    return localOptimistic;
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
