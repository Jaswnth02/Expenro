import { z } from 'zod';

export const expenseSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  category_id: z.string().min(1, 'Please select a category'),
  description: z.string().optional().nullable(),
  payment_method: z.enum([
    'Cash',
    'UPI',
    'Debit Card',
    'Credit Card',
    'Bank Transfer',
    'Other',
  ]),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date (YYYY-MM-DD)'),
  notes: z.string().optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
