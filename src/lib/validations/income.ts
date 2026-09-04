import { z } from 'zod';

export const incomeSchema = z.object({
  source: z.string().min(2, 'Source must be at least 2 characters'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().optional().nullable(),
  income_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date (YYYY-MM-DD)'),
  notes: z.string().optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
