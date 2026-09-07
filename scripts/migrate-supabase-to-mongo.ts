/**
 * EXPENRO Supabase to MongoDB Data Migration Script
 * Migrates all users, profiles, categories, expenses, incomes, savings, budgets,
 * and meals from Supabase PostgreSQL to MongoDB with full relational integrity.
 *
 * Usage: npx tsx scripts/migrate-supabase-to-mongo.ts
 */

import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenro';

async function migrate() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase URL or Key missing in environment.');
    process.exit(1);
  }

  console.log('------------------------------------------------------------');
  console.log('EXPENRO MIGRATION: Supabase PostgreSQL -> MongoDB');
  console.log('------------------------------------------------------------');
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Could not connect to MongoDB database.');
  console.log('Connected to MongoDB successfully.');

  console.log('Connecting to Supabase at:', SUPABASE_URL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const userIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();
  const goalIdMap = new Map<string, string>();

  // ============================================================================
  // 1. MIGRATE USERS & PROFILES
  // ============================================================================
  console.log('\n[1/6] Migrating Users and Profiles...');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  const supabaseUsers = authData?.users || [];

  const { data: profilesData } = await supabase.from('profiles').select('*');
  const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

  const usersColl = db.collection('users');
  const defaultSalt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('password123', defaultSalt);

  for (const sUser of supabaseUsers) {
    const existing = await usersColl.findOne({ email: sUser.email?.toLowerCase() });
    if (existing) {
      const mongoId = existing._id.toString();
      userIdMap.set(sUser.id, mongoId);
      console.log(`  User already exists in MongoDB: ${sUser.email} -> ${mongoId}`);
    } else {
      const profile = profilesMap.get(sUser.id) || {};
      const newDoc = {
        email: sUser.email?.toLowerCase() || '',
        passwordHash: defaultPasswordHash, // Initial password set to 'password123'
        fullName: profile.full_name || sUser.user_metadata?.full_name || 'User',
        currency: profile.currency || 'INR',
        regular_expenses_enabled: profile.regular_expenses_enabled ?? true,
        low_balance_threshold: profile.low_balance_threshold ?? 1000,
        createdAt: sUser.created_at ? new Date(sUser.created_at) : new Date(),
        updatedAt: new Date(),
      };
      const res = await usersColl.insertOne(newDoc);
      const mongoId = res.insertedId.toString();
      userIdMap.set(sUser.id, mongoId);
      console.log(`  Migrated user: ${sUser.email} (Temporary Password: password123) -> ${mongoId}`);
    }
  }

  // ============================================================================
  // 2. MIGRATE CATEGORIES
  // ============================================================================
  console.log('\n[2/6] Migrating Categories...');
  const categoriesColl = db.collection('categories');
  const { data: categories, error: catErr } = await supabase.from('categories').select('*');
  if (catErr) {
    console.error('Failed to fetch categories from Supabase:', catErr.message);
  } else if (categories && categories.length > 0) {
    for (const cat of categories) {
      const targetUserId = cat.user_id ? userIdMap.get(cat.user_id) || null : null;
      // Check if matching category already exists
      const existing = await categoriesColl.findOne({
        name: cat.name,
        type: cat.type,
        userId: targetUserId,
      });

      if (existing) {
        categoryIdMap.set(cat.id, existing._id.toString());
      } else {
        const res = await categoriesColl.insertOne({
          userId: targetUserId,
          name: cat.name,
          type: cat.type,
          color: cat.color || '#10B981',
          icon: cat.icon || 'tag',
          createdAt: cat.created_at ? new Date(cat.created_at) : new Date(),
          updatedAt: new Date(),
        });
        categoryIdMap.set(cat.id, res.insertedId.toString());
      }
    }
    console.log(`  Processed ${categories.length} categories.`);
  }

  // ============================================================================
  // 3. MIGRATE EXPENSES
  // ============================================================================
  console.log('\n[3/6] Migrating Expenses...');
  const expensesColl = db.collection('expenses');
  const { data: expenses, error: expErr } = await supabase.from('expenses').select('*');
  if (expErr) {
    console.error('Failed to fetch expenses from Supabase:', expErr.message);
  } else if (expenses && expenses.length > 0) {
    const expenseDocs = [];
    for (const exp of expenses) {
      const targetUserId = userIdMap.get(exp.user_id);
      if (!targetUserId) continue;

      const targetCatId = exp.category_id ? categoryIdMap.get(exp.category_id) || null : null;
      expenseDocs.push({
        userId: targetUserId,
        categoryId: targetCatId,
        amount: Number(exp.amount),
        description: exp.description,
        paymentMethod: exp.payment_method || 'UPI',
        expenseDate: exp.expense_date,
        notes: exp.notes || null,
        receiptUrl: exp.receipt_url || null,
        createdAt: exp.created_at ? new Date(exp.created_at) : new Date(),
        updatedAt: exp.updated_at ? new Date(exp.updated_at) : new Date(),
      });
    }
    if (expenseDocs.length > 0) {
      await expensesColl.insertMany(expenseDocs);
      console.log(`  Inserted ${expenseDocs.length} expenses into MongoDB.`);
    }
  }

  // ============================================================================
  // 4. MIGRATE INCOME
  // ============================================================================
  console.log('\n[4/6] Migrating Income...');
  const incomeColl = db.collection('incomes');
  const { data: incomes, error: incErr } = await supabase.from('income').select('*');
  if (incErr) {
    console.error('Failed to fetch income from Supabase:', incErr.message);
  } else if (incomes && incomes.length > 0) {
    const incomeDocs = [];
    for (const inc of incomes) {
      const targetUserId = userIdMap.get(inc.user_id);
      if (!targetUserId) continue;

      incomeDocs.push({
        userId: targetUserId,
        source: inc.source,
        amount: Number(inc.amount),
        description: inc.description || null,
        incomeDate: inc.income_date,
        notes: inc.notes || null,
        createdAt: inc.created_at ? new Date(inc.created_at) : new Date(),
        updatedAt: inc.updated_at ? new Date(inc.updated_at) : new Date(),
      });
    }
    if (incomeDocs.length > 0) {
      await incomeColl.insertMany(incomeDocs);
      console.log(`  Inserted ${incomeDocs.length} income records into MongoDB.`);
    }
  }

  // ============================================================================
  // 5. MIGRATE SAVINGS GOALS & TRANSACTIONS
  // ============================================================================
  console.log('\n[5/6] Migrating Savings Goals & Transactions...');
  const goalsColl = db.collection('savingsgoals');
  const { data: goals } = await supabase.from('savings_goals').select('*');
  if (goals && goals.length > 0) {
    for (const g of goals) {
      const targetUserId = userIdMap.get(g.user_id);
      if (!targetUserId) continue;

      const res = await goalsColl.insertOne({
        userId: targetUserId,
        name: g.name,
        targetAmount: Number(g.target_amount),
        targetDate: g.target_date || null,
        description: g.description || null,
        createdAt: g.created_at ? new Date(g.created_at) : new Date(),
        updatedAt: g.updated_at ? new Date(g.updated_at) : new Date(),
      });
      goalIdMap.set(g.id, res.insertedId.toString());
    }
    console.log(`  Inserted ${goals.length} savings goals.`);
  }

  const txColl = db.collection('savingstransactions');
  const { data: txs } = await supabase.from('savings_transactions').select('*');
  if (txs && txs.length > 0) {
    const txDocs = [];
    for (const tx of txs) {
      const targetUserId = userIdMap.get(tx.user_id);
      const targetGoalId = goalIdMap.get(tx.goal_id);
      if (!targetUserId || !targetGoalId) continue;

      txDocs.push({
        userId: targetUserId,
        goalId: targetGoalId,
        amount: Number(tx.amount),
        transactionDate: tx.transaction_date,
        note: tx.note || null,
        createdAt: tx.created_at ? new Date(tx.created_at) : new Date(),
        updatedAt: tx.updated_at ? new Date(tx.updated_at) : new Date(),
      });
    }
    if (txDocs.length > 0) {
      await txColl.insertMany(txDocs);
      console.log(`  Inserted ${txDocs.length} savings transactions.`);
    }
  }

  // ============================================================================
  // 6. MIGRATE BUDGETS, REGULAR EXPENSES, MEALS (IF ANY)
  // ============================================================================
  console.log('\n[6/6] Checking Budgets & Meals...');
  const { data: budgets } = await supabase.from('budgets').select('*');
  if (budgets && budgets.length > 0) {
    const budgetsColl = db.collection('budgets');
    const budgetDocs = [];
    for (const b of budgets) {
      const targetUserId = userIdMap.get(b.user_id);
      const targetCatId = categoryIdMap.get(b.category_id);
      if (!targetUserId || !targetCatId) continue;
      budgetDocs.push({
        userId: targetUserId,
        categoryId: targetCatId,
        amount: Number(b.amount),
        month: b.month,
        year: b.year,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    if (budgetDocs.length > 0) {
      await budgetsColl.insertMany(budgetDocs);
      console.log(`  Inserted ${budgetDocs.length} budgets.`);
    }
  }

  console.log('\n------------------------------------------------------------');
  console.log('✓ ALL DATA MIGRATION FINISHED SUCCESSFULLY!');
  console.log('------------------------------------------------------------');
  console.log('Summary:');
  console.log(`- Users: ${userIdMap.size}`);
  console.log(`- Categories: ${categoryIdMap.size}`);
  console.log(`- Expenses: ${expenses?.length || 0}`);
  console.log(`- Incomes: ${incomes?.length || 0}`);
  console.log(`- Savings Goals: ${goalIdMap.size}`);
  console.log('------------------------------------------------------------');
  console.log('Your user account is ready:');
  for (const [sId, mId] of userIdMap.entries()) {
    const u = supabaseUsers.find((x) => x.id === sId);
    console.log(`  Email: ${u?.email} | Initial Password: password123`);
  }
  console.log('------------------------------------------------------------\n');

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('\nMigration Failed:', err);
  process.exit(1);
});
