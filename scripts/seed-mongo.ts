/**
 * EXPENRO MongoDB Seeder Script
 * Usage: npx tsx scripts/seed-mongo.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenro';

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established.');
  }

  // Check or create test user
  const usersColl = db.collection('users');
  const existingUser = await usersColl.findOne({ email: 'user@expenro.app' });

  let userId: string;
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const insertResult = await usersColl.insertOne({
      email: 'user@expenro.app',
      passwordHash,
      fullName: 'Alex Morgan',
      currency: 'INR',
      regular_expenses_enabled: true,
      low_balance_threshold: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = insertResult.insertedId.toString();
    console.log('Created default user: user@expenro.app / password123 (ID:', userId, ')');
  } else {
    userId = existingUser._id.toString();
    console.log('Default user already exists (ID:', userId, ')');
  }

  // Seed categories
  const categoriesColl = db.collection('categories');
  const catCount = await categoriesColl.countDocuments();
  if (catCount === 0) {
    const defaultCategories = [
      { name: 'Food', type: 'expense', color: '#F59E0B', icon: 'Utensils', userId: null },
      { name: 'Mess Food', type: 'expense', color: '#EA580C', icon: 'Utensils', userId: null },
      { name: 'Tea & Snacks', type: 'expense', color: '#F59E0B', icon: 'Coffee', userId: null },
      { name: 'Stationary', type: 'expense', color: '#8B5CF6', icon: 'BookOpen', userId: null },
      { name: 'Grocery', type: 'expense', color: '#10B981', icon: 'ShoppingBag', userId: null },
      { name: 'Travel', type: 'expense', color: '#F97316', icon: 'Plane', userId: null },
      { name: 'Salary', type: 'income', color: '#10B981', icon: 'Briefcase', userId: null },
      { name: 'Internship', type: 'income', color: '#3B82F6', icon: 'Award', userId: null },
      { name: 'Freelancing', type: 'income', color: '#8B5CF6', icon: 'Laptop', userId: null },
      { name: 'Pocket Money', type: 'income', color: '#F59E0B', icon: 'Wallet', userId: null },
      { name: 'Scholarship', type: 'income', color: '#06B6D4', icon: 'GraduationCap', userId: null },
      { name: 'Other', type: 'income', color: '#6B7280', icon: 'DollarSign', userId: null },
    ].map((c) => ({
      ...c,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await categoriesColl.insertMany(defaultCategories);
    console.log(`Seeded ${defaultCategories.length} default categories.`);
  } else {
    console.log(`Categories collection already contains ${catCount} categories.`);
  }

  console.log('MongoDB initialization complete!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed script error:', err);
  process.exit(1);
});
