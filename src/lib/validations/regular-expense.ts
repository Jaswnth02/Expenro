import { z } from 'zod';

export const regularExpenseSchema = z
  .object({
    name: z.string().trim().min(1, 'Please enter a name for the regular expense'),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    category_id: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    frequency: z.enum(['daily', 'interval_days', 'weekly', 'monthly']),
    interval_days: z.coerce.number().int().positive().nullable().optional(),
    weekly_day: z.coerce.number().int().min(0).max(6).nullable().optional(),
    monthly_day: z.coerce.number().int().min(1).max(31).nullable().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid start date (YYYY-MM-DD)'),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid end date (YYYY-MM-DD)')
      .nullable()
      .optional()
      .or(z.literal('')),
    display_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please provide a valid time in 24-hr format (HH:MM)')
      .nullable()
      .optional()
      .or(z.literal('')),
    active: z.boolean().default(true),
    display_order: z.coerce.number().default(0),
  })
  .refine(
    (data) => {
      if (!data.end_date) return true;
      return data.end_date >= data.start_date;
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  )
  .refine(
    (data) => {
      if (data.frequency === 'interval_days') {
        return typeof data.interval_days === 'number' && data.interval_days > 0;
      }
      return true;
    },
    {
      message: 'Please provide a valid day interval (greater than 0)',
      path: ['interval_days'],
    }
  )
  .refine(
    (data) => {
      if (data.frequency === 'weekly') {
        return typeof data.weekly_day === 'number' && data.weekly_day >= 0 && data.weekly_day <= 6;
      }
      return true;
    },
    {
      message: 'Please select a day of the week',
      path: ['weekly_day'],
    }
  )
  .refine(
    (data) => {
      if (data.frequency === 'monthly') {
        return typeof data.monthly_day === 'number' && data.monthly_day >= 1 && data.monthly_day <= 31;
      }
      return true;
    },
    {
      message: 'Please select a valid day of the month (1-31)',
      path: ['monthly_day'],
    }
  );

export type RegularExpenseSchemaInput = z.infer<typeof regularExpenseSchema>;
