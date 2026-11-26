const { expect } = require('chai');
const { createDb } = require('../../src/db');
const { createRepo } = require('../../src/repo');

describe('Expense repository (in-memory SQLite)', () => {
  let repo;
  const make = (o = {}) => ({ amount: 100, categoryId: 1, description: 'item', expenseDate: '2026-11-10', ...o });

  beforeEach(() => { repo = createRepo(createDb(':memory:')); });

  it('seeds the default categories', () => {
    const names = repo.listCategories().map((c) => c.name);
    expect(names).to.include.members(['Food', 'Travel', 'Bills']);
  });

  it('creates and reads back an expense with its category name', () => {
    const e = repo.createExpense(make({ amount: 250.5, description: 'Lunch' }));
    expect(e).to.include({ amount: 250.5, category: 'Food', description: 'Lunch', expenseDate: '2026-11-10' });
    expect(repo.getExpense(e.id)).to.deep.equal(e);
  });

  it('returns null for unknown ids', () => {
    expect(repo.getExpense(999)).to.equal(null);
    expect(repo.updateExpense(999, make())).to.equal(null);
    expect(repo.deleteExpense(999)).to.equal(false);
  });

  it('updates and deletes', () => {
    const e = repo.createExpense(make());
    const u = repo.updateExpense(e.id, make({ amount: 300, categoryId: 2 }));
    expect(u).to.include({ amount: 300, category: 'Travel' });
    expect(repo.deleteExpense(e.id)).to.equal(true);
    expect(repo.getExpense(e.id)).to.equal(null);
  });

  it('filters by category and date range', () => {
    repo.createExpense(make({ categoryId: 1, expenseDate: '2026-11-01' }));
    repo.createExpense(make({ categoryId: 2, expenseDate: '2026-11-15' }));
    repo.createExpense(make({ categoryId: 2, expenseDate: '2026-12-01' }));
    expect(repo.listExpenses({ category: 2 })).to.have.length(2);
    expect(repo.listExpenses({ from: '2026-11-10', to: '2026-11-30' })).to.have.length(1);
  });

  it('sorts by amount and date', () => {
    repo.createExpense(make({ amount: 50, expenseDate: '2026-11-01' }));
    repo.createExpense(make({ amount: 500, expenseDate: '2026-11-02' }));
    expect(repo.listExpenses({ sort: 'amount_desc' })[0].amount).to.equal(500);
    expect(repo.listExpenses({ sort: 'date_asc' })[0].expenseDate).to.equal('2026-11-01');
  });

  it('rejects duplicate category names', () => {
    expect(() => repo.createCategory('Food')).to.throw();
    expect(repo.createCategory('Pets')).to.include({ name: 'Pets' });
  });

  it('summarises a month by category', () => {
    repo.createExpense(make({ amount: 100.1, categoryId: 1 }));
    repo.createExpense(make({ amount: 200.2, categoryId: 1 }));
    repo.createExpense(make({ amount: 50, categoryId: 2 }));
    repo.createExpense(make({ amount: 999, expenseDate: '2026-10-31' }));
    const s = repo.summary('2026-11');
    expect(s.total).to.equal(350.3);
    expect(s.count).to.equal(3);
    expect(s.byCategory[0]).to.deep.include({ category: 'Food', total: 300.3, count: 2 });
  });

  it('returns an empty summary for a month with no data', () => {
    expect(repo.summary('2020-01')).to.deep.equal({ month: '2020-01', total: 0, count: 0, byCategory: [] });
  });
});
