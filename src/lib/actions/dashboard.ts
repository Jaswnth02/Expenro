'use server';

import { connectToDatabase, isMongoConfigured } from '@/lib/mongodb/client';
import {
  ExpenseModel,
  IncomeModel,
  CategoryModel,
  BudgetModel,
  SavingsGoalModel,
  SavingsTransactionModel,
  UserModel,
} from '@/lib/mongodb/models';
import { getEffectiveUserId } from '@/lib/auth/session';
import {
  Expense,
  Income,
  Category,
  Budget,
  SavingsGoal,
  FinancialSummary,
} from '@/types';
import { calculateSavingsRate } from '@/lib/calculations/finance';
import { ALLOWED_EXPENSE_CATEGORIES } from '@/lib/data-service';

export interface DashboardBootstrapData {
  summary: FinancialSummary;
  expenses: Expense[];
  incomes: Income[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  categories: Category[];
}

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * High-performance single-roundtrip batch action for loading dashboard data.
 * Executes in Mumbai region (bom1) directly alongside MongoDB Atlas (ap-south-1).
 */
export async function getDashboardDataAction(
  month: number,
  year: number
): Promise<ActionResponse<DashboardBootstrapData>> {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'Database not configured' };
    }

    await connectToDatabase();
    const userId = await getEffectiveUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const monthStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    // Execute all queries in parallel on the MongoDB cluster
    const [
      expenseDocs,
      incomeDocs,
      categoryDocs,
      budgetDocs,
      goalDocs,
      savingsTransactions,
      allTimeIncomeAgg,
      allTimeExpenseAgg,
      lastIncomeDoc,
      userDoc,
    ] = await Promise.all([
      // 1. Month expenses
      ExpenseModel.find({
        userId,
        expenseDate: { $gte: startDate, $lte: endDate },
      })
        .sort({ expenseDate: -1, createdAt: -1 })
        .lean(),

      // 2. Month incomes
      IncomeModel.find({
        userId,
        incomeDate: { $gte: startDate, $lte: endDate },
      })
        .sort({ incomeDate: -1, createdAt: -1 })
        .lean(),

      // 3. User & System categories
      CategoryModel.find({
        $or: [{ userId }, { userId: null }],
      }).lean(),

      // 4. Month budgets
      BudgetModel.find({ userId, month, year }).lean(),

      // 5. Savings goals
      SavingsGoalModel.find({ userId }).sort({ createdAt: -1 }).lean(),

      // 6. Savings transactions for goals
      SavingsTransactionModel.find({ userId }).lean(),

      // 7. All-time income aggregate
      IncomeModel.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 8. All-time expense aggregate
      ExpenseModel.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 9. Most recent single income
      IncomeModel.findOne({ userId })
        .sort({ incomeDate: -1, createdAt: -1 })
        .lean(),

      // 10. User preferences
      UserModel.findById(userId).select('low_balance_threshold').lean(),
    ]);

    // Build category map
    const catMap = new Map<string, Category>();
    const formattedCategories: Category[] = categoryDocs.map((c: any) => {
      const cat: Category = {
        id: c._id.toString(),
        user_id: c.userId,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        created_at: new Date(c.createdAt).toISOString(),
      };
      catMap.set(cat.id, cat);
      return cat;
    });

    const categories = formattedCategories.filter(
      (c) => c.type === 'income' || ALLOWED_EXPENSE_CATEGORIES.includes(c.name)
    );

    // Format expenses
    const expenses: Expense[] = expenseDocs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      category_id: d.categoryId ? d.categoryId.toString() : null,
      amount: Number(d.amount),
      description: d.description,
      payment_method: (d.paymentMethod as any) || 'UPI',
      expense_date: d.expenseDate,
      notes: d.notes || null,
      receipt_url: d.receiptUrl || null,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt || d.createdAt).toISOString(),
      category:
        d.categoryId && catMap.has(d.categoryId.toString())
          ? catMap.get(d.categoryId.toString())
          : undefined,
    }));

    // Format incomes
    const incomes: Income[] = incomeDocs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      source: d.source,
      amount: Number(d.amount),
      description: d.description || null,
      income_date: d.incomeDate,
      notes: d.notes || null,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt || d.createdAt).toISOString(),
    }));

    // Format budgets
    const budgets: Budget[] = budgetDocs.map((d: any) => ({
      id: d._id.toString(),
      user_id: d.userId,
      category_id: d.categoryId,
      category: catMap.get(d.categoryId),
      amount: Number(d.amount),
      month: d.month,
      year: d.year,
      created_at: new Date(d.createdAt).toISOString(),
      updated_at: new Date(d.updatedAt).toISOString(),
    }));

    // Savings calculations
    const savedAmountMap = new Map<string, number>();
    for (const tx of savingsTransactions) {
      const gId = tx.goalId.toString();
      savedAmountMap.set(gId, (savedAmountMap.get(gId) || 0) + Number(tx.amount));
    }

    const savingsGoals: SavingsGoal[] = goalDocs.map((g: any) => {
      const id = g._id.toString();
      const targetAmount = Number(g.targetAmount);
      const savedAmount = savedAmountMap.get(id) || 0;
      const progressPercentage =
        targetAmount > 0
          ? Math.round(Math.min(100, (savedAmount / targetAmount) * 100))
          : 0;

      return {
        id,
        user_id: g.userId,
        name: g.name,
        target_amount: targetAmount,
        target_date: g.targetDate,
        description: g.description,
        saved_amount: savedAmount,
        progress_percentage: progressPercentage,
        created_at: new Date(g.createdAt).toISOString(),
        updated_at: new Date(g.updatedAt).toISOString(),
      };
    });

    // Financial Summary
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalSavings = savingsGoals.reduce((sum, g) => sum + (g.saved_amount || 0), 0);

    const allTimeIncome = allTimeIncomeAgg[0]?.total || 0;
    const allTimeExpenses = allTimeExpenseAgg[0]?.total || 0;
    const allTimeSavings = totalSavings;

    const availableBalance = Number(
      (allTimeIncome - allTimeExpenses - allTimeSavings).toFixed(2)
    );
    const lowBalanceThreshold = (userDoc as any)?.low_balance_threshold ?? 1000;
    const isLowBalance = availableBalance < lowBalanceThreshold;

    const lastIncome = lastIncomeDoc
      ? {
          amount: Number(lastIncomeDoc.amount),
          source: lastIncomeDoc.source,
          income_date: lastIncomeDoc.incomeDate,
          description: lastIncomeDoc.description || null,
        }
      : null;

    const savingsRate = calculateSavingsRate(
      totalSavings,
      totalIncome > 0 ? totalIncome : allTimeIncome > 0 ? allTimeIncome : 0
    );

    const summary: FinancialSummary = {
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

    return {
      success: true,
      data: {
        summary,
        expenses,
        incomes,
        savingsGoals,
        budgets,
        categories: categories.length > 0 ? categories : formattedCategories,
      },
    };
  } catch (err) {
    console.error('[getDashboardDataAction] Error:', err);
    return { success: false, error: getErrorMessage(err) };
  }
}
