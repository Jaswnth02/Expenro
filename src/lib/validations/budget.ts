import { z } from 'zod';

export const budgetSchema = z.object({
  category_id: z.string().min(1, 'Please select a category'),
  amount: z.coerce.number().positive('Budget amount must be greater than zero'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
