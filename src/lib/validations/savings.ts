import { z } from 'zod';

export const savingsGoalSchema = z.object({
  name: z.string().min(2, 'Goal name must be at least 2 characters'),
  target_amount: z.coerce.number().positive('Target amount must be greater than zero'),
  target_date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

export const savingsTransactionSchema = z.object({
  goal_id: z.string().min(1, 'Please select a savings goal'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date'),
  note: z.string().optional().nullable(),
});

export type SavingsTransactionInput = z.infer<typeof savingsTransactionSchema>;
