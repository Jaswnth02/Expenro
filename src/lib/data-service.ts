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
import {
  calculateRemainingBalance,
  calculateSavingsRate,
  calculateGoalProgress,
  calculateBudgetUsage,
  calculateRemainingBudget,
  determineBudgetStatus,
} from '@/lib/calculations/finance';

// User-approved active expense categories
export const ALLOWED_EXPENSE_CATEGORIES = [
  'Food',
  'Mess Food',
  'Tea & Snacks',
  'Stationary',
  'Grocery',
  'Travel',
];

// Default categories matching user requirements
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', user_id: null, name: 'Food', type: 'expense', color: '#F59E0B', icon: 'Utensils', created_at: new Date().toISOString() },
  { id: 'cat-mess-food', user_id: null, name: 'Mess Food', type: 'expense', color: '#EA580C', icon: 'Utensils', created_at: new Date().toISOString() },
  { id: 'cat-tea-snacks', user_id: null, name: 'Tea & Snacks', type: 'expense', color: '#F59E0B', icon: 'Coffee', created_at: new Date().toISOString() },
  { id: 'cat-stationary', user_id: null, name: 'Stationary', type: 'expense', color: '#8B5CF6', icon: 'BookOpen', created_at: new Date().toISOString() },
  { id: 'cat-grocery', user_id: null, name: 'Grocery', type: 'expense', color: '#10B981', icon: 'ShoppingBag', created_at: new Date().toISOString() },
  { id: 'cat-travel', user_id: null, name: 'Travel', type: 'expense', color: '#F97316', icon: 'Plane', created_at: new Date().toISOString() },
  // Income categories
  { id: 'cat-salary', user_id: null, name: 'Salary', type: 'income', color: '#10B981', icon: 'Briefcase', created_at: new Date().toISOString() },
  { id: 'cat-internship', user_id: null, name: 'Internship', type: 'income', color: '#3B82F6', icon: 'Award', created_at: new Date().toISOString() },
  { id: 'cat-freelancing', user_id: null, name: 'Freelancing', type: 'income', color: '#8B5CF6', icon: 'Laptop', created_at: new Date().toISOString() },
  { id: 'cat-pocket-money', user_id: null, name: 'Pocket Money', type: 'income', color: '#F59E0B', icon: 'Wallet', created_at: new Date().toISOString() },
  { id: 'cat-scholarship', user_id: null, name: 'Scholarship', type: 'income', color: '#06B6D4', icon: 'GraduationCap', created_at: new Date().toISOString() },
  { id: 'cat-other-inc', user_id: null, name: 'Other', type: 'income', color: '#6B7280', icon: 'DollarSign', created_at: new Date().toISOString() },
];

export const INITIAL_USER: UserProfile = {
  id: 'user-default-1',
  full_name: 'Alex Morgan',
  email: 'alex.morgan@expenro.app',
  currency: 'INR',
  regular_expenses_enabled: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

// Compact Mess Food Bill Historical Data [month, day, session (M/A/N), amount]
const MESS_COMPACT_DATA: [string, number, 'M' | 'A' | 'N', number][] = [
  ["06",2,"M",50],["06",3,"M",50],["06",4,"M",50],["06",5,"M",50],["06",6,"M",50],["06",9,"M",50],["06",10,"M",50],["06",11,"M",50],["06",12,"M",50],["06",16,"M",50],["06",17,"M",50],["06",18,"M",50],["06",23,"M",50],["06",24,"M",50],["06",25,"M",50],["06",30,"M",50],["06",8,"A",80],["06",2,"N",50],["06",4,"N",50],["06",5,"N",50],["06",6,"N",50],["06",8,"N",50],["06",9,"N",50],["06",10,"N",50],["06",11,"N",50],["06",12,"N",50],["06",15,"N",50],["06",16,"N",50],["06",17,"N",50],["06",18,"N",50],["06",22,"N",50],["06",23,"N",50],["06",24,"N",50],["06",29,"N",50],["06",30,"N",50],["07",1,"M",50],["07",2,"M",50],["07",3,"M",50],["07",7,"M",50],["07",8,"M",50],["07",10,"M",50],["07",14,"M",50],["07",15,"M",50],["07",16,"M",50],["07",17,"M",50],["07",21,"M",50],["07",22,"M",50],["07",23,"M",50],["07",24,"M",50],["07",25,"M",50],["07",28,"M",50],["07",29,"M",50],["07",30,"M",50],["07",31,"M",50],["07",2,"A",80],["07",29,"A",80],["07",1,"N",50],["07",2,"N",50],["07",3,"N",50],["07",7,"N",50],["07",8,"N",50],["07",9,"N",50],["07",10,"N",50],["07",13,"N",50],["07",16,"N",50],["07",20,"N",50],["07",21,"N",50],["07",22,"N",50],["07",27,"N",50],["07",28,"N",50],["07",29,"N",50],["08",3,"M",50],["08",5,"M",50],["08",6,"M",50],["08",7,"M",50],["08",8,"M",50],["08",10,"M",50],["08",11,"M",50],["08",12,"M",50],["08",13,"M",50],["08",14,"M",50],["08",18,"M",50],["08",19,"M",50],["08",20,"M",50],["08",22,"M",50],["08",24,"M",50],["08",25,"M",50],["08",26,"M",50],["08",27,"M",50],["08",28,"M",50],["08",29,"M",50],["08",3,"N",50],["08",4,"N",50],["08",5,"N",50],["08",6,"N",50],["08",7,"N",50],["08",8,"N",50],["08",10,"N",50],["08",11,"N",50],["08",13,"N",50],["08",17,"N",100],["08",18,"N",100],["08",19,"N",50],["08",21,"N",50],["08",24,"N",50],["08",25,"N",50],["08",26,"N",50],["08",27,"N",50],["08",28,"N",50],["08",31,"N",50],["09",1,"M",50],["09",2,"M",50],["09",3,"M",50],["09",1,"N",50],["09",2,"N",50]
];

const SESSION_META: Record<'M' | 'A' | 'N', { name: string; time: string }> = {
  M: { name: 'Morning', time: '08:30:00' },
  A: { name: 'Afternoon', time: '13:00:00' },
  N: { name: 'Night', time: '20:00:00' },
};

export function getMessFoodHistoricalExpenses(userId = 'user-default-1', categoryId = 'cat-mess-food'): Expense[] {
  return MESS_COMPACT_DATA.map(([month, day, sess, amount], idx) => {
    const dayStr = String(day).padStart(2, '0');
    const date = `2026-${month}-${dayStr}`;
    const meta = SESSION_META[sess];
    const iso = `${date}T${meta.time}.000Z`;
    return {
      id: `exp-mess-${idx + 1}`,
      user_id: userId,
      category_id: categoryId,
      amount,
      description: `Mess - ${meta.name}`,
      payment_method: 'UPI' as PaymentMethod,
      expense_date: date,
      notes: `Mess food bill - ${meta.name} session`,
      created_at: iso,
      updated_at: iso,
    };
  });
}

// Seed initial realistic data matching specification
export function getInitialSeedData() {
  const currentYear = 2026;
  const currentMonth = 9; // September

  const expenses: Expense[] = [
    ...getMessFoodHistoricalExpenses('user-default-1', 'cat-mess-food'),
    {
      id: 'exp-1',
      user_id: 'user-default-1',
      category_id: 'cat-food',
      amount: 4200,
      description: 'Campus cafeteria & grocery stock',
      payment_method: 'UPI',
      expense_date: '2026-09-02',
      notes: 'Weekly groceries from Mart',
      created_at: '2026-09-02T12:30:00.000Z',
      updated_at: '2026-09-02T12:30:00.000Z',
    },
    {
      id: 'exp-2',
      user_id: 'user-default-1',
      category_id: 'cat-transport',
      amount: 2100,
      description: 'Monthly metro smartcard reload',
      payment_method: 'Debit Card',
      expense_date: '2026-09-01',
      notes: 'College commute card',
      created_at: '2026-09-01T09:15:00.000Z',
      updated_at: '2026-09-01T09:15:00.000Z',
    },
    {
      id: 'exp-3',
      user_id: 'user-default-1',
      category_id: 'cat-shopping',
      amount: 3500,
      description: 'Books & semester stationery',
      payment_method: 'UPI',
      expense_date: '2026-09-03',
      notes: 'Textbooks for financial analytics',
      created_at: '2026-09-03T14:20:00.000Z',
      updated_at: '2026-09-03T14:20:00.000Z',
    },
    {
      id: 'exp-4',
      user_id: 'user-default-1',
      category_id: 'cat-bills',
      amount: 2000,
      description: 'High-speed broadband & phone recharge',
      payment_method: 'Bank Transfer',
      expense_date: '2026-09-01',
      notes: 'Monthly fiber plan',
      created_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'exp-5',
      user_id: 'user-default-1',
      category_id: 'cat-entertainment',
      amount: 1200,
      description: 'Movie & weekend dining out',
      payment_method: 'Credit Card',
      expense_date: '2026-09-02',
      notes: 'Weekend with batchmates',
      created_at: '2026-09-02T20:45:00.000Z',
      updated_at: '2026-09-02T20:45:00.000Z',
    },
    {
      id: 'exp-6',
      user_id: 'user-default-1',
      category_id: 'cat-food',
      amount: 3450,
      description: 'Team project dinner & coffee',
      payment_method: 'UPI',
      expense_date: '2026-09-03',
      notes: null,
      created_at: '2026-09-03T18:00:00.000Z',
      updated_at: '2026-09-03T18:00:00.000Z',
    },
  ];

  const incomes: Income[] = [
    {
      id: 'inc-1',
      user_id: 'user-default-1',
      source: 'Internship',
      amount: 25000,
      description: 'Fintech Software Developer Stipend',
      income_date: '2026-09-01',
      notes: 'Monthly stipend credited via direct deposit',
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'goal-1',
      user_id: 'user-default-1',
      name: 'MacBook Fund',
      target_amount: 60000,
      target_date: '2026-12-31',
      description: 'M3 MacBook Air for development & college coursework',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'goal-2',
      user_id: 'user-default-1',
      name: 'Emergency Fund',
      target_amount: 30000,
      target_date: '2027-03-31',
      description: '3 months basic living cushion',
      created_at: '2026-08-15T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
  ];

  const savingsTransactions: SavingsTransaction[] = [
    {
      id: 'sav-tx-1',
      user_id: 'user-default-1',
      goal_id: 'goal-1',
      amount: 20000,
      transaction_date: '2026-08-10',
      note: 'Initial seed deposit',
      created_at: '2026-08-10T10:00:00.000Z',
      updated_at: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'sav-tx-2',
      user_id: 'user-default-1',
      goal_id: 'goal-1',
      amount: 5000,
      transaction_date: '2026-09-01',
      note: 'September stipend allocation',
      created_at: '2026-09-01T11:00:00.000Z',
      updated_at: '2026-09-01T11:00:00.000Z',
    },
    {
      id: 'sav-tx-3',
      user_id: 'user-default-1',
      goal_id: 'goal-2',
      amount: 3550,
      transaction_date: '2026-09-02',
      note: 'Emergency savings auto-transfer',
      created_at: '2026-09-02T15:00:00.000Z',
      updated_at: '2026-09-02T15:00:00.000Z',
    },
  ];

  const budgets: Budget[] = [
    {
      id: 'bud-1',
      user_id: 'user-default-1',
      category_id: 'cat-food',
      amount: 8000,
      month: currentMonth,
      year: currentYear,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'bud-2',
      user_id: 'user-default-1',
      category_id: 'cat-transport',
      amount: 3000,
      month: currentMonth,
      year: currentYear,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'bud-3',
      user_id: 'user-default-1',
      category_id: 'cat-shopping',
      amount: 4000,
      month: currentMonth,
      year: currentYear,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'bud-4',
      user_id: 'user-default-1',
      category_id: 'cat-entertainment',
      amount: 2500,
      month: currentMonth,
      year: currentYear,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
  ];

  const regularExpenses: RegularExpense[] = [
    {
      id: 'reg-1',
      user_id: 'user-default-1',
      name: 'Mess - Morning',
      amount: 50,
      category_id: 'cat-mess-food',
      icon: 'Utensils',
      frequency: 'daily',
      interval_days: null,
      weekly_day: null,
      monthly_day: null,
      start_date: '2026-09-01',
      end_date: null,
      display_time: '08:00',
      active: true,
      display_order: 1,
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'reg-2',
      user_id: 'user-default-1',
      name: 'Mess - Afternoon',
      amount: 80,
      category_id: 'cat-mess-food',
      icon: 'Utensils',
      frequency: 'daily',
      interval_days: null,
      weekly_day: null,
      monthly_day: null,
      start_date: '2026-09-01',
      end_date: null,
      display_time: '12:30',
      active: true,
      display_order: 2,
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'reg-3',
      user_id: 'user-default-1',
      name: 'Mess - Night',
      amount: 50,
      category_id: 'cat-mess-food',
      icon: 'Utensils',
      frequency: 'daily',
      interval_days: null,
      weekly_day: null,
      monthly_day: null,
      start_date: '2026-09-01',
      end_date: null,
      display_time: '19:30',
      active: true,
      display_order: 3,
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'reg-4',
      user_id: 'user-default-1',
      name: 'Bus',
      amount: 30,
      category_id: 'cat-travel',
      icon: 'Plane',
      frequency: 'interval_days',
      interval_days: 2,
      weekly_day: null,
      monthly_day: null,
      start_date: '2026-09-01',
      end_date: null,
      display_time: '08:30',
      active: true,
      display_order: 4,
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'reg-5',
      user_id: 'user-default-1',
      name: 'Haircut',
      amount: 150,
      category_id: 'cat-other-exp',
      icon: 'Activity',
      frequency: 'monthly',
      interval_days: null,
      weekly_day: null,
      monthly_day: 5,
      start_date: '2026-09-01',
      end_date: null,
      display_time: '11:00',
      active: true,
      display_order: 5,
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: '2026-09-01T08:00:00.000Z',
    },
  ];

  return {
    categories: DEFAULT_CATEGORIES,
    expenses,
    incomes,
    savingsGoals,
    savingsTransactions,
    budgets,
    regularExpenses,
    regular_expenses_enabled: true,
  };
}

// Local Storage / In-memory store state manager for browser testing
const STORAGE_KEY = 'expenro_app_data_v2';

export class LocalFinanceStore {
  private static memoryCache: any = null;

  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private static getData() {
    if (!this.isBrowser()) {
      if (!this.memoryCache) {
        this.memoryCache = getInitialSeedData();
      }
      return this.memoryCache;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedData();
      // Check if v1 exists to preserve custom modifications while including mess entries
      const v1Raw = localStorage.getItem('expenro_app_data_v1');
      if (v1Raw) {
        try {
          const v1 = JSON.parse(v1Raw);
          if (Array.isArray(v1.categories) && v1.categories.length > 0) {
            seed.categories = v1.categories;
          }
          if (Array.isArray(v1.expenses)) {
            const existingIds = new Set(seed.expenses.map((e: Expense) => e.id));
            for (const exp of v1.expenses) {
              if (!existingIds.has(exp.id) && !exp.id.startsWith('exp-mess-')) {
                seed.expenses.push(exp);
                existingIds.add(exp.id);
              }
            }
          }
        } catch {}
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      // Ensure Mess items are present if previously seeded under v2
      let changed = false;
      if (parsed && Array.isArray(parsed.categories) && !parsed.categories.some((c: any) => c.name === 'Mess Food')) {
        parsed.categories.unshift(DEFAULT_CATEGORIES[0]);
        changed = true;
      }
      if (parsed && Array.isArray(parsed.expenses)) {
        if (!parsed.expenses.some((e: any) => e.description?.startsWith('Mess - '))) {
          const messExpenses = getMessFoodHistoricalExpenses('user-default-1', 'cat-mess-food');
          parsed.expenses = [...messExpenses, ...parsed.expenses];
          changed = true;
        } else {
          // Ensure category is updated to cat-mess-food
          for (const exp of parsed.expenses) {
            if (exp.description?.startsWith('Mess - ') && exp.category_id !== 'cat-mess-food') {
              exp.category_id = 'cat-mess-food';
              changed = true;
            }
          }
        }
      }
      if (parsed && Array.isArray(parsed.regularExpenses)) {
        for (const reg of parsed.regularExpenses) {
          if (reg.name?.startsWith('Mess - ') && reg.category_id !== 'cat-mess-food') {
            reg.category_id = 'cat-mess-food';
            changed = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      const seed = getInitialSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  private static saveData(data: any) {
    if (!this.isBrowser()) {
      this.memoryCache = data;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Categories
  static getCategories(): Category[] {
    const data = this.getData();
    if (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0) {
      data.categories = [...DEFAULT_CATEGORIES];
      this.saveData(data);
    }
    const deleted = new Set((data.deletedCategoryIds || []) as string[]);
    const allowed = new Set(ALLOWED_EXPENSE_CATEGORIES.map((n) => n.toLowerCase()));
    return (data.categories || []).filter(
      (c: Category) =>
        !deleted.has(c.id) &&
        (c.type === 'income' || allowed.has(c.name.trim().toLowerCase()))
    );
  }

  static addCategory(category: Omit<Category, 'id' | 'created_at'>): Category {
    const data = this.getData();
    const categories = data.categories || [];
    const newCat: Category = {
      ...category,
      id: 'cat-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    data.categories = [...categories, newCat];
    this.saveData(data);
    return newCat;
  }

  static updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'created_at'>>
  ): Category | null {
    const data = this.getData();
    const categories = data.categories || [];
    const idx = categories.findIndex((c: Category) => c.id === id);
    if (idx !== -1) {
      const updated = {
        ...categories[idx],
        ...updates,
      };
      categories[idx] = updated;
      data.categories = categories;
      this.saveData(data);
      return updated;
    }
    return null;
  }

  static deleteCategory(id: string): boolean {
    const data = this.getData();
    if (!data.deletedCategoryIds) {
      data.deletedCategoryIds = [];
    }
    if (!data.deletedCategoryIds.includes(id)) {
      data.deletedCategoryIds.push(id);
    }
    const categories = data.categories || [];
    const filtered = categories.filter((c: Category) => c.id !== id);
    data.categories = filtered;
    this.saveData(data);
    return true;
  }

  static resetCategories(): Category[] {
    const data = this.getData();
    data.deletedCategoryIds = [];
    data.categories = [...DEFAULT_CATEGORIES];
    this.saveData(data);
    return data.categories;
  }

  // Expenses CRUD
  static getExpenses(month?: number, year?: number): Expense[] {
    const data = this.getData();
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    let list: Expense[] = (data.expenses || []).map((exp: Expense) => ({
      ...exp,
      category: catMap.get(exp.category_id || '') || undefined,
    }));

    if (month && year) {
      list = list.filter((e) => {
        const d = new Date(e.expense_date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }

    return list.sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  }

  static addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense {
    const data = this.getData();
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.expenses = [newExpense, ...(data.expenses || [])];
    this.saveData(data);
    return newExpense;
  }

  static updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const data = this.getData();
    const idx = (data.expenses || []).findIndex((e: Expense) => e.id === id);
    if (idx === -1) return null;
    data.expenses[idx] = {
      ...data.expenses[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveData(data);
    return data.expenses[idx];
  }

  static deleteExpense(id: string): boolean {
    const data = this.getData();
    const prevLen = (data.expenses || []).length;
    data.expenses = (data.expenses || []).filter((e: Expense) => e.id !== id);
    this.saveData(data);
    return data.expenses.length < prevLen;
  }

  // Income CRUD
  static getIncomes(month?: number, year?: number): Income[] {
    const data = this.getData();
    let list: Income[] = data.incomes || [];
    if (month && year) {
      list = list.filter((i) => {
        const d = new Date(i.income_date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }
    return list.sort(
      (a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime()
    );
  }

  static addIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Income {
    const data = this.getData();
    const newIncome: Income = {
      ...income,
      id: 'inc-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.incomes = [newIncome, ...(data.incomes || [])];
    this.saveData(data);
    return newIncome;
  }

  static deleteIncome(id: string): boolean {
    const data = this.getData();
    const prevLen = (data.incomes || []).length;
    data.incomes = (data.incomes || []).filter((i: Income) => i.id !== id);
    this.saveData(data);
    return data.incomes.length < prevLen;
  }

  // Savings Goals & Transactions
  static getSavingsGoals(): SavingsGoal[] {
    const data = this.getData();
    const goals: SavingsGoal[] = data.savingsGoals || [];
    const transactions: SavingsTransaction[] = data.savingsTransactions || [];

    return goals.map((goal) => {
      const goalTxs = transactions.filter((t) => t.goal_id === goal.id);
      const saved_amount = goalTxs.reduce((sum, t) => sum + Number(t.amount), 0);
      const progress_percentage = calculateGoalProgress(saved_amount, goal.target_amount);
      return {
        ...goal,
        saved_amount,
        progress_percentage,
      };
    });
  }

  static addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>): SavingsGoal {
    const data = this.getData();
    const newGoal: SavingsGoal = {
      ...goal,
      id: 'goal-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      saved_amount: 0,
      progress_percentage: 0,
    };
    data.savingsGoals = [...(data.savingsGoals || []), newGoal];
    this.saveData(data);
    return newGoal;
  }

  static deleteSavingsGoal(id: string): boolean {
    const data = this.getData();
    const prevLen = (data.savingsGoals || []).length;
    data.savingsGoals = (data.savingsGoals || []).filter((g: SavingsGoal) => g.id !== id);
    // Also remove transactions associated with this goal
    data.savingsTransactions = (data.savingsTransactions || []).filter((t: SavingsTransaction) => t.goal_id !== id);
    this.saveData(data);
    return (data.savingsGoals || []).length < prevLen;
  }

  static getSavingsTransactions(month?: number, year?: number): SavingsTransaction[] {
    const data = this.getData();
    const goals = this.getSavingsGoals();
    const goalMap = new Map(goals.map((g: SavingsGoal) => [g.id, g]));

    let list: SavingsTransaction[] = (data.savingsTransactions || []).map((t: SavingsTransaction) => ({
      ...t,
      goal: goalMap.get(t.goal_id),
    }));

    if (month && year) {
      list = list.filter((t: SavingsTransaction) => {
        const d = new Date(t.transaction_date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }

    return list.sort(
      (a: SavingsTransaction, b: SavingsTransaction) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }

  static addSavingsTransaction(
    tx: Omit<SavingsTransaction, 'id' | 'created_at' | 'updated_at'>
  ): SavingsTransaction {
    const data = this.getData();
    const newTx: SavingsTransaction = {
      ...tx,
      id: 'sav-tx-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.savingsTransactions = [newTx, ...(data.savingsTransactions || [])];
    this.saveData(data);
    return newTx;
  }

  static deleteSavingsTransaction(id: string): boolean {
    const data = this.getData();
    const prevLen = (data.savingsTransactions || []).length;
    data.savingsTransactions = (data.savingsTransactions || []).filter((t: SavingsTransaction) => t.id !== id);
    this.saveData(data);
    return (data.savingsTransactions || []).length < prevLen;
  }

  // Budgets
  static getBudgets(month: number, year: number): Budget[] {
    const data = this.getData();
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const expenses = this.getExpenses(month, year);

    const budgets: Budget[] = (data.budgets || []).filter(
      (b: Budget) => b.month === month && b.year === year
    );

    return budgets.map((b) => {
      const catExpenses = expenses.filter((e) => e.category_id === b.category_id);
      const spent_amount = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const remaining_amount = calculateRemainingBudget(b.amount, spent_amount);
      const usage_percentage = calculateBudgetUsage(spent_amount, b.amount);
      const status = determineBudgetStatus(spent_amount, b.amount);

      return {
        ...b,
        category: catMap.get(b.category_id),
        spent_amount,
        remaining_amount,
        usage_percentage,
        status,
      };
    });
  }

  static addOrUpdateBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Budget {
    const data = this.getData();
    data.budgets = data.budgets || [];
    const idx = data.budgets.findIndex(
      (b: Budget) =>
        b.category_id === budget.category_id &&
        b.month === budget.month &&
        b.year === budget.year
    );

    if (idx >= 0) {
      data.budgets[idx] = {
        ...data.budgets[idx],
        amount: budget.amount,
        updated_at: new Date().toISOString(),
      };
      this.saveData(data);
      return data.budgets[idx];
    } else {
      const newBudget: Budget = {
        ...budget,
        id: 'bud-' + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.budgets.push(newBudget);
      this.saveData(data);
      return newBudget;
    }
  }

  // Summary calculation for selected month & year
  static getFinancialSummary(month: number, year: number): FinancialSummary {
    const expenses = this.getExpenses(month, year);
    const incomes = this.getIncomes(month, year);
    const savingsTxs = this.getSavingsTransactions(month, year);

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalSavings = savingsTxs.reduce((sum, s) => sum + Number(s.amount), 0);
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
  }

  // ----------------------------------------------------------------------------
  // REGULAR EXPENSES
  // ----------------------------------------------------------------------------
  static getRegularExpensesSettings(): boolean {
    const data = this.getData();
    return data.regular_expenses_enabled !== false;
  }

  static setRegularExpensesSettings(enabled: boolean): boolean {
    const data = this.getData();
    data.regular_expenses_enabled = enabled;
    this.saveData(data);
    return enabled;
  }

  static getRegularExpenses(): RegularExpense[] {
    const data = this.getData();
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const list: RegularExpense[] = (data.regularExpenses || []).map((r: RegularExpense) => ({
      ...r,
      category: catMap.get(r.category_id || '') || undefined,
    }));

    return list.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.name.localeCompare(b.name);
    });
  }

  static addRegularExpense(expense: RegularExpenseInput): RegularExpense {
    const data = this.getData();
    const currentList = this.getRegularExpenses();
    const newExpense: RegularExpense = {
      ...expense,
      id: 'reg-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.regularExpenses = [...currentList, newExpense];
    this.saveData(data);
    return newExpense;
  }

  static updateRegularExpense(
    id: string,
    updates: Partial<RegularExpense>
  ): RegularExpense | null {
    const data = this.getData();
    const list: RegularExpense[] = data.regularExpenses || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated: RegularExpense = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    data.regularExpenses = list;
    this.saveData(data);
    return updated;
  }

  static toggleRegularExpense(id: string, active?: boolean): RegularExpense | null {
    const data = this.getData();
    const list: RegularExpense[] = data.regularExpenses || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const newActive = active !== undefined ? active : !list[idx].active;
    list[idx] = {
      ...list[idx],
      active: newActive,
      updated_at: new Date().toISOString(),
    };
    data.regularExpenses = list;
    this.saveData(data);
    return list[idx];
  }

  static deleteRegularExpense(id: string): boolean {
    const data = this.getData();
    const prevLen = (data.regularExpenses || []).length;
    data.regularExpenses = (data.regularExpenses || []).filter(
      (r: RegularExpense) => r.id !== id
    );
    this.saveData(data);
    return data.regularExpenses.length < prevLen;
  }

  static getEligibleRegularExpenses(
    targetDate: string,
    options?: { checkTime?: boolean; currentTime?: string }
  ): RegularExpense[] {
    if (!this.getRegularExpensesSettings()) return [];
    const all = this.getRegularExpenses();
    return filterEligibleExpenses(all, targetDate, options);
  }

  static addSelectedRegularExpenses(
    items: { regularExpenseId: string; amount: number; description?: string }[],
    paymentMethod: PaymentMethod,
    expenseDate: string
  ): Expense[] {
    const allRegular = this.getRegularExpenses();
    const regMap = new Map(allRegular.map((r) => [r.id, r]));
    const createdExpenses: Expense[] = [];

    for (const item of items) {
      const reg = regMap.get(item.regularExpenseId);
      if (!reg) continue;

      const created = this.addExpense({
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
  }

  static resetToSeed() {
    const seed = getInitialSeedData();
    this.saveData(seed);
    return seed;
  }
}
