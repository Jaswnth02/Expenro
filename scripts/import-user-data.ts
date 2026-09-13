/**
 * EXPENRO User Data Importer
 * Parses scripts/data.csv and cleanly imports expenses, rent, meal entries,
 * and monthly mess bill settlements into MongoDB for user jaswanthmg2006@gmail.com.
 *
 * Usage: npx tsx scripts/import-user-data.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenro';
const TARGET_USER_EMAIL = 'jaswanthmg2006@gmail.com';

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += char;
    }
  }
  result.push(curr.trim());
  return result;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const MONTH_MAP: Record<string, number> = {
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
};

async function runImport() {
  console.log('============================================================');
  console.log('EXPENRO DATA IMPORT: Raw CSV -> MongoDB');
  console.log('============================================================');

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection failed.');

  const user = await db.collection('users').findOne({ email: TARGET_USER_EMAIL });
  if (!user) {
    throw new Error(`User not found for email: ${TARGET_USER_EMAIL}`);
  }
  const userId = user._id.toString();
  console.log(`Target User: ${user.email} (${userId})`);

  // Fetch category IDs
  const categories = await db.collection('categories').find({
    $or: [{ userId: null }, { userId }],
  }).toArray();

  const getCatId = (nameQuery: string): string | null => {
    const found = categories.find(c => c.name.toLowerCase() === nameQuery.toLowerCase());
    return found ? found._id.toString() : null;
  };

  const catMap: Record<string, string | null> = {
    'Food': getCatId('Food'),
    'Tea & Snacks': getCatId('Tea & Snacks'),
    'Stationary': getCatId('Stationary'),
    'Grocery': getCatId('Grocery'),
    'Others': getCatId('Other') || getCatId('others'),
    'Rent': getCatId('Rent'),
    'Mess Food': getCatId('Mess Food'),
  };

  console.log('Resolved Category IDs:');
  Object.entries(catMap).forEach(([k, v]) => console.log(`  ${k} -> ${v}`));

  // Parse CSV
  const csvContent = fs.readFileSync(path.resolve(process.cwd(), 'scripts/data.csv'), 'utf-8');
  const lines = csvContent.split('\n');

  interface ParsedDailyExpense {
    month: number;
    monthName: string;
    category: string;
    day: number;
    dateStr: string;
    amount: number;
    description: string;
    notes?: string;
  }

  interface ParsedDailyMeal {
    month: number;
    monthName: string;
    day: number;
    dateStr: string;
    session: 'Morning' | 'Afternoon' | 'Night';
    mealType: 'breakfast' | 'lunch' | 'dinner';
    name: string;
    amount: number;
    status: 'eaten' | 'skipped';
  }

  const parsedExpenses: ParsedDailyExpense[] = [];
  const parsedMeals: ParsedDailyMeal[] = [];
  const monthlySummaries: Record<string, { exp: number; mess: number; rent: number; grand: number }> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const cells = parseCSVLine(line);

    // Expense table
    if (cells[1] && MONTH_MAP[cells[1]] && lines[i + 1] && lines[i + 1].includes('Category')) {
      const monthName = cells[1];
      const monthNum = MONTH_MAP[monthName];
      i++; // Category header
      i++; // empty line or first row
      if (lines[i] && parseCSVLine(lines[i]).every(c => !c)) {
        i++;
      }

      const categoriesList = ['Food', 'Tea & Snacks', 'Stationary', 'Grocery', 'Others'];
      let notesRow: string[] = [];

      while (i < lines.length) {
        const rowLine = lines[i];
        const rowCells = parseCSVLine(rowLine);
        const catName = rowCells[1];

        if (categoriesList.includes(catName)) {
          for (let col = 3; col < rowCells.length; col++) {
            const val = rowCells[col];
            const day = col - 2;
            if (val && val !== '-' && val !== '--') {
              const num = parseFloat(val);
              if (!isNaN(num) && num > 0) {
                const dateStr = `2026-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                parsedExpenses.push({
                  month: monthNum,
                  monthName,
                  category: catName,
                  day,
                  dateStr,
                  amount: num,
                  description: catName,
                });
              }
            }
          }
          i++;
        } else if (!catName && rowCells.some(c => c && isNaN(Number(c)) && c !== '-')) {
          notesRow = rowCells;
          i++;
        } else if (rowCells[1] === 'Total') {
          const exp = parseFloat(rowCells[2]) || 0;
          const mess = parseFloat(rowCells[3]) || 0;
          const rent = parseFloat(rowCells[4]) || 0;
          const grand = rowCells[5] ? parseFloat(rowCells[5]) : exp + mess + rent;
          monthlySummaries[monthName] = { exp, mess, rent, grand };
          i++;
          break;
        } else {
          i++;
        }
      }

      // Map notes row to "Others" expenses
      if (notesRow.length > 0) {
        for (let col = 3; col < notesRow.length; col++) {
          const note = notesRow[col];
          const day = col - 2;
          if (note && note.trim() !== '') {
            const exp = parsedExpenses.find(e => e.month === monthNum && e.category === 'Others' && e.day === day);
            if (exp) {
              exp.notes = note.trim();
              exp.description = capitalize(note.trim());
            }
          }
        }
      }
    } else if (cells[1] && MONTH_MAP[cells[1]] && cells[2] === 'Session') {
      const monthName = cells[1];
      const monthNum = MONTH_MAP[monthName];
      i++; // session header
      if (lines[i] && parseCSVLine(lines[i]).every(c => !c)) {
        i++;
      }

      const sessionNames = ['Morning', 'Afternoon', 'Night'];

      while (i < lines.length) {
        const rowLine = lines[i];
        const rowCells = parseCSVLine(rowLine);
        const sessName = rowCells[2] as 'Morning' | 'Afternoon' | 'Night';

        if (sessionNames.includes(sessName)) {
          const mealType: 'breakfast' | 'lunch' | 'dinner' =
            sessName === 'Morning' ? 'breakfast' : sessName === 'Afternoon' ? 'lunch' : 'dinner';

          for (let col = 3; col < rowCells.length; col++) {
            const val = rowCells[col];
            const day = col - 2;
            if (day > 31) continue;

            const dateStr = `2026-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (val === '-' || val === '--') {
              parsedMeals.push({
                month: monthNum,
                monthName,
                day,
                dateStr,
                session: sessName,
                mealType,
                name: sessName === 'Morning' ? 'Breakfast' : sessName === 'Afternoon' ? 'Lunch' : 'Dinner',
                amount: 0,
                status: 'skipped',
              });
            } else if (val) {
              const num = parseFloat(val);
              if (!isNaN(num) && num > 0) {
                parsedMeals.push({
                  month: monthNum,
                  monthName,
                  day,
                  dateStr,
                  session: sessName,
                  mealType,
                  name: sessName === 'Morning' ? 'Breakfast' : sessName === 'Afternoon' ? 'Lunch' : 'Dinner',
                  amount: num,
                  status: 'eaten',
                });
              }
            }
          }
          i++;
        } else if (rowCells[2] === 'Total') {
          i++;
          break;
        } else {
          i++;
        }
      }
    } else {
      i++;
    }
  }

  console.log(`\nParsed ${parsedExpenses.length} daily category expenses and ${parsedMeals.length} meal entries.`);

  // 1. CLEANUP PREVIOUS EXPENSES & MEALS FOR JUNE - SEPTEMBER 2026
  console.log('\n[1/4] Cleaning up previous data for June - Sept 2026...');
  const delExp = await db.collection('expenses').deleteMany({
    userId,
    expenseDate: { $gte: '2026-06-01', $lte: '2026-09-30' },
  });
  console.log(`  Deleted ${delExp.deletedCount} old expense records.`);

  const delMeals1 = await db.collection('mealentries').deleteMany({ userId });
  const delMeals2 = await db.collection('meal_entries').deleteMany({ userId });
  console.log(`  Deleted ${delMeals1.deletedCount + delMeals2.deletedCount} old meal records.`);

  const delSettlements1 = await db.collection('mealsettlements').deleteMany({ userId });
  const delSettlements2 = await db.collection('meal_settlements').deleteMany({ userId });
  console.log(`  Deleted ${delSettlements1.deletedCount + delSettlements2.deletedCount} old settlement records.`);

  // Drop deprecated snake_case collections if empty
  try {
    if (await db.collection('meal_entries').countDocuments() === 0) {
      await db.collection('meal_entries').drop();
    }
    if (await db.collection('meal_settlements').countDocuments() === 0) {
      await db.collection('meal_settlements').drop();
    }
  } catch (e) {
    // Ignore drop errors
  }

  // 2. CREATE MEAL SETTLEMENTS & SETTLEMENT EXPENSES (June, July, August)
  console.log('\n[2/4] Creating Monthly Mess Bill Settlements for June, July, August...');
  const settlementsColl = db.collection('mealsettlements');
  const expensesColl = db.collection('expenses');
  const settlementMap: Record<number, string> = {};

  const settledMonths = [
    { month: 6, year: 2026, paymentDate: '2026-06-30', declaredAmount: 1780 },
    { month: 7, year: 2026, paymentDate: '2026-07-31', declaredAmount: 1860 },
    { month: 8, year: 2026, paymentDate: '2026-08-31', declaredAmount: 2050 },
  ];

  for (const item of settledMonths) {
    const monthMeals = parsedMeals.filter(m => m.month === item.month && m.status === 'eaten');
    const totalMeals = monthMeals.length;
    const totalAmount = monthMeals.reduce((s, m) => s + m.amount, 0);

    // Create the settlement expense record under "Mess Food"
    const expRes = await expensesColl.insertOne({
      userId,
      categoryId: catMap['Mess Food'],
      amount: totalAmount,
      description: `Mess Food Bill Settlement - ${item.month}/${item.year}`,
      paymentMethod: 'UPI',
      expenseDate: item.paymentDate,
      notes: `Settlement for ${totalMeals} meals in ${String(item.month).padStart(2, '0')}/${item.year}`,
      receiptUrl: null,
      createdAt: new Date(`${item.paymentDate}T20:00:00.000Z`),
      updatedAt: new Date(`${item.paymentDate}T20:00:00.000Z`),
    });

    const expenseId = expRes.insertedId.toString();

    // Create settlement document
    const setRes = await settlementsColl.insertOne({
      userId,
      month: item.month,
      year: item.year,
      totalMeals,
      totalAmount,
      paymentMethod: 'UPI',
      paymentDate: item.paymentDate,
      expenseId,
      notes: `Settled ${totalMeals} meals (Declared ₹${item.declaredAmount})`,
      createdAt: new Date(`${item.paymentDate}T20:00:00.000Z`),
      updatedAt: new Date(`${item.paymentDate}T20:00:00.000Z`),
    });

    const settlementId = setRes.insertedId.toString();
    settlementMap[item.month] = settlementId;

    console.log(`  Settled Month ${item.month}/2026: ₹${totalAmount} (${totalMeals} meals) -> Settlement ID: ${settlementId}`);
  }

  // 3. INSERT ALL MEAL ENTRIES
  console.log('\n[3/4] Inserting Meal Entries into mealentries...');
  const mealDocs = parsedMeals.map(m => {
    const isSettled = m.month in settlementMap;
    const settlementId = settlementMap[m.month] || null;
    return {
      userId,
      date: m.dateStr,
      mealType: m.mealType,
      name: m.name,
      amount: m.amount,
      status: m.status,
      notes: null,
      isSettled,
      settlementId,
      createdAt: new Date(`${m.dateStr}T12:00:00.000Z`),
      updatedAt: new Date(`${m.dateStr}T12:00:00.000Z`),
    };
  });

  const mealInsertRes = await db.collection('mealentries').insertMany(mealDocs);
  console.log(`  Inserted ${mealInsertRes.insertedCount} meal entries into mealentries.`);

  // 4. INSERT DAILY EXPENSES + MONTHLY RENTS
  console.log('\n[4/4] Inserting Daily Expenses and Monthly Rent...');
  const expenseDocs = parsedExpenses.map(e => {
    const catId = catMap[e.category] || null;
    return {
      userId,
      categoryId: catId,
      amount: e.amount,
      description: e.description,
      paymentMethod: 'UPI',
      expenseDate: e.dateStr,
      notes: e.notes || null,
      receiptUrl: null,
      createdAt: new Date(`${e.dateStr}T14:00:00.000Z`),
      updatedAt: new Date(`${e.dateStr}T14:00:00.000Z`),
    };
  });

  // Add Monthly Rent (₹3,000 for each month on the 1st)
  const rentMonths = [
    { date: '2026-06-01', monthName: 'June' },
    { date: '2026-07-01', monthName: 'July' },
    { date: '2026-08-01', monthName: 'August' },
    { date: '2026-09-01', monthName: 'September' },
  ];

  for (const r of rentMonths) {
    expenseDocs.push({
      userId,
      categoryId: catMap['Rent'],
      amount: 3000,
      description: 'Monthly Room Rent',
      paymentMethod: 'UPI',
      expenseDate: r.date,
      notes: `${r.monthName} 2026 Rent`,
      receiptUrl: null,
      createdAt: new Date(`${r.date}T10:00:00.000Z`),
      updatedAt: new Date(`${r.date}T10:00:00.000Z`),
    });
  }

  const expInsertRes = await expensesColl.insertMany(expenseDocs);
  console.log(`  Inserted ${expInsertRes.insertedCount} category & rent expenses.`);

  // ============================================================
  // VERIFICATION & RECONCILIATION
  // ============================================================
  console.log('\n============================================================');
  console.log('RECONCILIATION REPORT');
  console.log('============================================================');

  for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
    const mStr = String(mNum).padStart(2, '0');
    const monthExpenses = await expensesColl.find({
      userId,
      expenseDate: { $regex: `^2026-${mStr}` },
    }).toArray();

    const catTotals: Record<string, number> = {};
    let monthTotal = 0;

    for (const exp of monthExpenses) {
      monthTotal += exp.amount;
      const catObj = categories.find(c => c._id.toString() === exp.categoryId);
      const catTitle = catObj ? catObj.name : 'Unknown';
      catTotals[catTitle] = (catTotals[catTitle] || 0) + exp.amount;
    }

    const monthMeals = await db.collection('mealentries').find({
      userId,
      date: { $regex: `^2026-${mStr}` },
      status: 'eaten',
    }).toArray();

    const mealSum = monthMeals.reduce((s, m) => s + m.amount, 0);

    console.log(`\nMonth: ${mName} 2026:`);
    console.log(`  Total Expenses in DB: ₹${monthTotal}`);
    console.log('  Category Breakdown:');
    Object.entries(catTotals).forEach(([c, amt]) => console.log(`    - ${c}: ₹${amt}`));
    console.log(`  Meal Sessions: ${monthMeals.length} meals eaten = ₹${mealSum}`);

    const declared = monthlySummaries[mName];
    if (declared) {
      if (mNum < 9) {
        console.log(`  Expected Grand Total (Expenses ₹${declared.exp} + Mess ₹${declared.mess} + Rent ₹${declared.rent}): ₹${declared.grand}`);
        console.log(`  Reconciled: ${monthTotal === declared.grand ? '✅ MATCHED EXACTLY' : '❌ MISMATCH'}`);
      } else {
        console.log(`  September: Expenses ₹${declared.exp} + Rent ₹${declared.rent} = ₹${declared.exp + declared.rent} (DB: ₹${monthTotal})`);
        console.log(`  September Active Mess Dues: ₹${mealSum} (Expected: ₹${declared.mess})`);
        console.log(`  Reconciled: ${monthTotal === declared.exp + declared.rent && mealSum === declared.mess ? '✅ MATCHED EXACTLY' : '❌ MISMATCH'}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDatabase import completed successfully!');
}

runImport().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
