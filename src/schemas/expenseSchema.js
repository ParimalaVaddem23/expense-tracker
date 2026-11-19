'use strict';
/**
 * Zod schemas for request validation.
 */
const { z } = require('zod');

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

/** Today's date as YYYY-MM-DD (server local time). */
function todayString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** True when the string is a real calendar date in YYYY-MM-DD form (rejects 2025-02-30). */
function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Reusable ISO date field (format + real date). */
const isoDate = (label) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a string` })
    .refine(isRealDate, { message: `${label} must be a valid date in YYYY-MM-DD format` });

const expenseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required', invalid_type_error: 'Title must be a string' })
    .trim()
    .min(1, 'Title is required')
    .max(100, 'Title must be at most 100 characters'),

  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .finite('Amount must be a finite number')
    .gt(0, 'Amount must be greater than 0')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
      message: 'Amount must have at most 2 decimal places',
    }),

  // errorMap covers missing and invalid values alike (zod forbids mixing it with required_error)
  category: z.enum(CATEGORIES, {
    errorMap: (issue, ctx) => ({
      message:
        ctx.data === undefined ? 'Category is required' : `Category must be one of: ${CATEGORIES.join(', ')}`,
    }),
  }),

  date: isoDate('Date').refine((v) => !isRealDate(v) || v <= todayString(), {
    message: 'Date cannot be in the future',
  }),

  note: z
    .string({ invalid_type_error: 'Note must be a string' })
    .max(255, 'Note must be at most 255 characters')
    .nullable()
    .optional(),
});

/** Query filters shared by GET /api/expenses and GET /api/summary. */
const filterSchema = z
  .object({
    category: z
      .enum(CATEGORIES, { errorMap: () => ({ message: `Category must be one of: ${CATEGORIES.join(', ')}` }) })
      .optional(),
    from: isoDate('from').optional(),
    to: isoDate('to').optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
  });

const idSchema = z.coerce
  .number({ invalid_type_error: 'id must be a positive integer' })
  .int('id must be a positive integer')
  .positive('id must be a positive integer');

const seedSchema = z.object({
  expenses: z.array(expenseSchema, {
    required_error: 'expenses is required',
    invalid_type_error: 'expenses must be an array',
  }),
});

module.exports = { CATEGORIES, expenseSchema, filterSchema, idSchema, seedSchema, todayString };
