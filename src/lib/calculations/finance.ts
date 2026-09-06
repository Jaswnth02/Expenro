import {
  BudgetStatus,
  FinancialHealthScore,
  FinancialInsight,
  FinancialSummary,
  Expense,
  Income,
  Budget,
  SavingsGoal,
} from '@/types';

/**
 * Remaining Balance = Total Income - Total Expenses
 */
export function calculateRemainingBalance(income: number, expenses: number): number {
  return Number((income - expenses).toFixed(2));
}

/**
 * Savings Rate = (Total Savings / Total Income) * 100
 * Handles division by zero safely
 */
export function calculateSavingsRate(savings: number, income: number): number {
  if (income <= 0) return 0;
  const rate = (savings / income) * 100;
  return Number(Math.max(0, Math.min(100, rate)).toFixed(1));
}

/**
 * Savings Goal Progress = (Saved Amount / Target Amount) * 100
 */
export function calculateGoalProgress(savedAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  const progress = (savedAmount / targetAmount) * 100;
  return Number(Math.max(0, Math.min(100, progress)).toFixed(1));
}

/**
 * Budget Usage Percentage = (Category Expenses / Category Budget) * 100
 */
export function calculateBudgetUsage(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Number(((spent / budget) * 100).toFixed(1));
}

/**
 * Remaining Budget = Budget - Category Expenses
 */
export function calculateRemainingBudget(budget: number, spent: number): number {
  return Number((budget - spent).toFixed(2));
}

/**
 * Budget Status:
 * - normal: < 80%
 * - near_limit: 80% - 100%
 * - exceeded: > 100%
 */
export function determineBudgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return 'normal';
  const ratio = (spent / budget) * 100;
  if (ratio > 100) return 'exceeded';
  if (ratio >= 80) return 'near_limit';
  return 'normal';
}

/**
 * Financial Health Score Engine (0 - 100)
 * Evaluates savings rate, budget adherence, and expense-to-income ratio.
 */
export function calculateFinancialHealthScore(
  summary: FinancialSummary,
  budgets: Budget[],
  goals: SavingsGoal[]
): FinancialHealthScore {
  let score = 50; // baseline
  const factors: { name: string; score: number; description: string }[] = [];

  // Factor 1: Savings Rate (up to +25 / -15)
  if (summary.savingsRate >= 30) {
    score += 25;
    factors.push({
      name: 'High Savings Rate',
      score: 25,
      description: `You're saving ${summary.savingsRate}% of your income, well above the recommended 20%.`,
    });
  } else if (summary.savingsRate >= 15) {
    score += 15;
    factors.push({
      name: 'Good Savings Rate',
      score: 15,
      description: `You're saving ${summary.savingsRate}% of your income. Keep building toward 25%.`,
    });
  } else if (summary.savingsRate > 0) {
    score += 5;
    factors.push({
      name: 'Modest Savings Rate',
      score: 5,
      description: `Saving ${summary.savingsRate}% is a good start, but aim to reach at least 15%.`,
    });
  } else {
    score -= 10;
    factors.push({
      name: 'Zero Savings',
      score: -10,
      description: 'No savings allocated this month. Try putting aside at least 10% of your earnings.',
    });
  }

  // Factor 2: Budget Adherence (up to +15 / -20)
  const totalBudgets = budgets.length;
  if (totalBudgets > 0) {
    const exceededCount = budgets.filter((b) => (b.usage_percentage ?? 0) > 100).length;
    const nearLimitCount = budgets.filter(
      (b) => (b.usage_percentage ?? 0) >= 80 && (b.usage_percentage ?? 0) <= 100
    ).length;

    if (exceededCount === 0 && nearLimitCount === 0) {
      score += 15;
      factors.push({
        name: 'Budget Discipline',
        score: 15,
        description: 'All your category budgets are well under the limits.',
      });
    } else if (exceededCount === 0) {
      score += 5;
      factors.push({
        name: 'Near Budget Limit',
        score: 5,
        description: `${nearLimitCount} budget(s) are approaching their limits.`,
      });
    } else {
      score -= Math.min(20, exceededCount * 10);
      factors.push({
        name: 'Budget Overruns',
        score: -Math.min(20, exceededCount * 10),
        description: `${exceededCount} category budget(s) have been exceeded this month.`,
      });
    }
  }

  // Factor 3: Liquidity & Running Balance (Ad-hoc replenishment model)
  const currentBalance = summary.availableBalance ?? summary.remainingBalance;
  const threshold = summary.lowBalanceThreshold ?? 1000;

  if (currentBalance > threshold * 2) {
    score += 15;
    factors.push({
      name: 'Healthy Cash Reserve',
      score: 15,
      description: 'Available wallet balance is well above the low-balance safety buffer.',
    });
  } else if (currentBalance >= threshold) {
    score += 5;
    factors.push({
      name: 'Stable Liquidity',
      score: 5,
      description: 'Available balance is above the replenishment threshold.',
    });
  } else if (currentBalance > 0) {
    score -= 10;
    factors.push({
      name: 'Low Balance',
      score: -10,
      description: 'Available balance is running low. Ready for funds replenishment.',
    });
  } else {
    score -= 25;
    factors.push({
      name: 'Deficit Balance',
      score: -25,
      description: 'Wallet balance is depleted. Immediate replenishment needed.',
    });
  }

  const finalScore = Math.max(5, Math.min(100, Math.round(score)));

  let rating: FinancialHealthScore['rating'] = 'Fair';
  let explanation = 'Your financial health is stable, with balanced spending and room for higher savings.';

  if (finalScore >= 80) {
    rating = 'Excellent';
    explanation = 'Outstanding financial discipline! You have strong savings and tight control over expenses.';
  } else if (finalScore >= 65) {
    rating = 'Good';
    explanation = 'Your savings rate is healthy and expenses are largely in check. Monitor your top categories.';
  } else if (finalScore >= 45) {
    rating = 'Fair';
    explanation = 'Spending is close to earnings. Trimming non-essential shopping can boost your score.';
  } else {
    rating = 'Poor';
    explanation = 'Expenses are running high relative to income. Review category budgets to regain control.';
  }

  return {
    score: finalScore,
    rating,
    explanation,
    factors,
  };
}

/**
 * Dynamic Smart Financial Insights Generator
 * Generates rule-based contextual insights from real data.
 */
export function generateFinancialInsights(
  expenses: Expense[],
  incomes: Income[],
  budgets: Budget[],
  summary: FinancialSummary
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  // 0. Low Balance Alert (Top Priority)
  const availableBal = summary.availableBalance ?? summary.remainingBalance;
  const lowThresh = summary.lowBalanceThreshold ?? 1000;
  if (summary.isLowBalance || availableBal <= lowThresh) {
    insights.push({
      id: 'low-balance-alert',
      type: 'warning',
      title: 'Low Balance Alert',
      message: `Available balance is ₹${availableBal.toLocaleString('en-IN')}, below your ₹${lowThresh.toLocaleString('en-IN')} safety buffer. Ready for funds replenishment.`,
    });
  }

  // 1. Highest Spending Category
  if (expenses.length > 0) {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const catName = e.category?.name || 'Other';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(e.amount);
    });

    let highestCat = '';
    let highestAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > highestAmount) {
        highestAmount = amt;
        highestCat = cat;
      }
    });

    if (highestCat && summary.totalExpenses > 0) {
      const pct = Math.round((highestAmount / summary.totalExpenses) * 100);
      insights.push({
        id: 'highest-category',
        type: 'info',
        title: 'Top Spending Category',
        message: `${highestCat} accounts for ${pct}% (₹${highestAmount.toLocaleString('en-IN')}) of your total spending this month.`,
      });
    }
  }

  // 2. Budget Alert Insights
  const exceededBudgets = budgets.filter((b) => (b.usage_percentage ?? 0) > 100);
  if (exceededBudgets.length > 0) {
    const cat = exceededBudgets[0].category?.name || 'Category';
    const overAmt = (exceededBudgets[0].spent_amount ?? 0) - exceededBudgets[0].amount;
    insights.push({
      id: 'budget-exceeded',
      type: 'warning',
      title: 'Budget Alert',
      message: `${cat} budget exceeded by ₹${overAmt.toLocaleString('en-IN')}. Check your latest expenses.`,
    });
  } else {
    const nearLimit = budgets.filter(
      (b) => (b.usage_percentage ?? 0) >= 80 && (b.usage_percentage ?? 0) <= 100
    );
    if (nearLimit.length > 0) {
      insights.push({
        id: 'budget-near',
        type: 'warning',
        title: 'Budget Warning',
        message: `${nearLimit[0].category?.name} budget is at ${nearLimit[0].usage_percentage}%. You have ₹${(nearLimit[0].remaining_amount ?? 0).toLocaleString('en-IN')} left.`,
      });
    }
  }

  // 3. Savings Rate Insight
  if (summary.savingsRate >= 20) {
    insights.push({
      id: 'savings-good',
      type: 'success',
      title: 'Healthy Savings',
      message: `Great job! Your savings rate of ${summary.savingsRate}% exceeds the standard 20% financial benchmark.`,
    });
  } else if (summary.totalIncome > 0 && summary.savingsRate < 10) {
    insights.push({
      id: 'savings-low',
      type: 'tip',
      title: 'Savings Opportunity',
      message: `Your current savings rate is ${summary.savingsRate}%. Setting aside even 10% each week can build your emergency cushion.`,
    });
  }

  // 4. Daily Spending Average
  if (expenses.length > 0) {
    const today = new Date();
    const daysPassed = Math.max(1, today.getDate());
    const avgDaily = Math.round(summary.totalExpenses / daysPassed);
    insights.push({
      id: 'daily-spending',
      type: 'info',
      title: 'Daily Spending',
      message: `Your average daily spending this month is ₹${avgDaily.toLocaleString('en-IN')}.`,
    });
  }

  return insights;
}
