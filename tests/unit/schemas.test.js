const { expect } = require('chai');
const { expenseSchema, categorySchema, summaryQuerySchema } = require('../../src/schemas');

const valid = { amount: 250, categoryId: 1, description: 'Lunch', expenseDate: '2026-11-20' };

describe('Zod schemas', () => {
  describe('expenseSchema', () => {
    it('accepts a valid expense', () => {
      expect(expenseSchema.safeParse(valid).success).to.equal(true);
    });
    it('defaults description to an empty string', () => {
      const { description, ...rest } = valid;
      expect(expenseSchema.parse(rest).description).to.equal('');
    });
    it('rejects zero and negative amounts', () => {
      expect(expenseSchema.safeParse({ ...valid, amount: 0 }).success).to.equal(false);
      expect(expenseSchema.safeParse({ ...valid, amount: -5 }).success).to.equal(false);
    });
    it('rejects a non-numeric amount with a clear message', () => {
      const r = expenseSchema.safeParse({ ...valid, amount: 'abc' });
      expect(r.success).to.equal(false);
      expect(r.error.issues[0].message).to.equal('Amount must be a number');
    });
    it('rejects bad date formats and impossible dates', () => {
      expect(expenseSchema.safeParse({ ...valid, expenseDate: '20/11/2026' }).success).to.equal(false);
      expect(expenseSchema.safeParse({ ...valid, expenseDate: '2026-13-45' }).success).to.equal(false);
    });
    it('rejects a description longer than 200 characters', () => {
      expect(expenseSchema.safeParse({ ...valid, description: 'x'.repeat(201) }).success).to.equal(false);
    });
  });

  describe('categorySchema', () => {
    it('trims the name', () => {
      expect(categorySchema.parse({ name: '  Pets ' }).name).to.equal('Pets');
    });
    it('rejects an empty name', () => {
      expect(categorySchema.safeParse({ name: '   ' }).success).to.equal(false);
    });
  });

  describe('summaryQuerySchema', () => {
    it('accepts YYYY-MM and rejects anything else', () => {
      expect(summaryQuerySchema.safeParse({ month: '2026-11' }).success).to.equal(true);
      expect(summaryQuerySchema.safeParse({ month: '2026-11-01' }).success).to.equal(false);
      expect(summaryQuerySchema.safeParse({}).success).to.equal(false);
    });
  });
});
