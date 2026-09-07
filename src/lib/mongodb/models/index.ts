import mongoose, { Schema, Model, Document } from 'mongoose';

// ==============================================================================
// 1. USER MODEL
// ==============================================================================
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  currency: string;
  regular_expenses_enabled: boolean;
  low_balance_threshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: 'User' },
    currency: { type: String, default: 'INR' },
    regular_expenses_enabled: { type: Boolean, default: true },
    low_balance_threshold: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ==============================================================================
// 2. CATEGORY MODEL
// ==============================================================================
export interface ICategory extends Document {
  userId: string | null;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    color: { type: String, default: '#10B981' },
    icon: { type: String, default: 'tag' },
  },
  { timestamps: true }
);

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

// ==============================================================================
// 3. EXPENSE MODEL
// ==============================================================================
export interface IExpense extends Document {
  userId: string;
  categoryId: string | null;
  amount: number;
  description: string;
  paymentMethod: string;
  expenseDate: string; // YYYY-MM-DD
  notes: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: String, required: true, index: true },
    categoryId: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    paymentMethod: { type: String, default: 'UPI' },
    expenseDate: { type: String, required: true, index: true },
    notes: { type: String, default: null },
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const ExpenseModel: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

// ==============================================================================
// 4. INCOME MODEL
// ==============================================================================
export interface IIncome extends Document {
  userId: string;
  source: string;
  amount: number;
  description: string | null;
  incomeDate: string; // YYYY-MM-DD
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    userId: { type: String, required: true, index: true },
    source: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: null },
    incomeDate: { type: String, required: true, index: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export const IncomeModel: Model<IIncome> =
  mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema);

// ==============================================================================
// 5. SAVINGS GOAL MODEL
// ==============================================================================
export interface ISavingsGoal extends Document {
  userId: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    targetDate: { type: String, default: null },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

export const SavingsGoalModel: Model<ISavingsGoal> =
  mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);

// ==============================================================================
// 6. SAVINGS TRANSACTION MODEL
// ==============================================================================
export interface ISavingsTransaction extends Document {
  userId: string;
  goalId: string;
  amount: number;
  transactionDate: string; // YYYY-MM-DD
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsTransactionSchema = new Schema<ISavingsTransaction>(
  {
    userId: { type: String, required: true, index: true },
    goalId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    transactionDate: { type: String, required: true, index: true },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

export const SavingsTransactionModel: Model<ISavingsTransaction> =
  mongoose.models.SavingsTransaction ||
  mongoose.model<ISavingsTransaction>('SavingsTransaction', SavingsTransactionSchema);

// ==============================================================================
// 7. BUDGET MODEL
// ==============================================================================
export interface IBudget extends Document {
  userId: string;
  categoryId: string;
  amount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ userId: 1, categoryId: 1, month: 1, year: 1 }, { unique: true });

export const BudgetModel: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);

// ==============================================================================
// 8. REGULAR EXPENSE MODEL
// ==============================================================================
export interface IRegularExpense extends Document {
  userId: string;
  name: string;
  amount: number;
  categoryId: string | null;
  icon: string | null;
  frequency: 'daily' | 'interval_days' | 'weekly' | 'monthly';
  intervalDays: number | null;
  weeklyDay: number | null;
  monthlyDay: number | null;
  startDate: string;
  endDate: string | null;
  displayTime: string | null;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const RegularExpenseSchema = new Schema<IRegularExpense>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    categoryId: { type: String, default: null, index: true },
    icon: { type: String, default: 'Tag' },
    frequency: { type: String, enum: ['daily', 'interval_days', 'weekly', 'monthly'], default: 'monthly' },
    intervalDays: { type: Number, default: null },
    weeklyDay: { type: Number, default: null },
    monthlyDay: { type: Number, default: null },
    startDate: { type: String, required: true },
    endDate: { type: String, default: null },
    displayTime: { type: String, default: null },
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const RegularExpenseModel: Model<IRegularExpense> =
  mongoose.models.RegularExpense ||
  mongoose.model<IRegularExpense>('RegularExpense', RegularExpenseSchema);

// ==============================================================================
// 9. MEAL ENTRY MODEL
// ==============================================================================
export interface IMealEntry extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'custom';
  name: string;
  amount: number;
  status: 'eaten' | 'skipped';
  notes: string | null;
  isSettled: boolean;
  settlementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MealEntrySchema = new Schema<IMealEntry>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'custom'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['eaten', 'skipped'], default: 'eaten' },
    notes: { type: String, default: null },
    isSettled: { type: Boolean, default: false },
    settlementId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

export const MealEntryModel: Model<IMealEntry> =
  mongoose.models.MealEntry || mongoose.model<IMealEntry>('MealEntry', MealEntrySchema);

// ==============================================================================
// 10. MEAL SETTLEMENT MODEL
// ==============================================================================
export interface IMealSettlement extends Document {
  userId: string;
  month: number;
  year: number;
  totalMeals: number;
  totalAmount: number;
  paymentMethod: string;
  paymentDate: string;
  expenseId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MealSettlementSchema = new Schema<IMealSettlement>(
  {
    userId: { type: String, required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalMeals: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'UPI' },
    paymentDate: { type: String, required: true },
    expenseId: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export const MealSettlementModel: Model<IMealSettlement> =
  mongoose.models.MealSettlement ||
  mongoose.model<IMealSettlement>('MealSettlement', MealSettlementSchema);
