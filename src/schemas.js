const { z } = require('zod');

const isoDate = z
  .string({ required_error: 'Date is required', invalid_type_error: 'Date is required' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Date is not a valid calendar date');

const expenseSchema = z.object({
  amount: z
    .number({ required_error: 'Amount must be a number', invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10000000, 'Amount is too large'),
  categoryId: z
    .number({ required_error: 'Category is required', invalid_type_error: 'Category is required' })
    .int()
    .positive('Category is required'),
  description: z.string().max(200, 'Description must be 200 characters or fewer').optional().default(''),
  expenseDate: isoDate,
});

const categorySchema = z.object({
  name: z
    .string({ required_error: 'Name is required', invalid_type_error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(40, 'Name must be 40 characters or fewer'),
});

const numericId = z.string().regex(/^\d+$/, 'Must be a number').transform(Number);

const listQuerySchema = z.object({
  category: numericId.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  sort: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).default('date_desc'),
});

const summaryQuerySchema = z.object({
  month: z.string({ required_error: 'month is required (YYYY-MM)' }).regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
});

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email is required' })
    .email('Email must be a valid email'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required', invalid_type_error: 'Email is required' })
    .email('Email must be a valid email'),
  password: z
    .string({ required_error: 'Password is required', invalid_type_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

module.exports = { expenseSchema, categorySchema, listQuerySchema, summaryQuerySchema, registerSchema, loginSchema };
