const { test, expect } = require('../fixtures');
const { validExpense, CATEGORY, today } = require('../helpers/dataFactory');

test.describe('Expense Tracker UI', () => {
  test.beforeEach(async ({ expensePage }) => {
    await expensePage.goto();
  });

  test('TC-001: add an expense with valid data @smoke', async ({ expensePage }) => {
    await expensePage.addExpense({ amount: 250, category: 'Food', description: 'Lunch with team' });
    await expect(expensePage.rowFor('Lunch with team')).toHaveCount(1);
    await expect(expensePage.rowFor('Lunch with team')).toContainText('250.00');
    await expect(expensePage.rowFor('Lunch with team')).toContainText('Food');
    await expect(expensePage.total).toHaveText('250.00');
  });

  test('TC-002: adding without an amount shows an error', async ({ expensePage }) => {
    await expensePage.addExpense({ category: 'Food', description: 'No amount' });
    await expect(expensePage.formError).toBeVisible();
    await expect(expensePage.formError).toContainText('Amount');
    await expect(expensePage.rows).toHaveCount(0);
    await expect(expensePage.emptyState).toBeVisible();
  });

  test('TC-003: edit an existing expense', async ({ api, expensePage }) => {
    await api.createOk(validExpense({ amount: 100, description: 'Original' }));
    await expensePage.goto();
    await expensePage.editExpense('Original', { amount: 300, category: 'Travel', description: 'Edited' });
    await expect(expensePage.rowFor('Edited')).toContainText('300.00');
    await expect(expensePage.rowFor('Edited')).toContainText('Travel');
    await expect(expensePage.rowFor('Original')).toHaveCount(0);
    await expect(expensePage.formTitle).toHaveText('Add expense');
  });

  test('TC-004: delete an expense', async ({ api, expensePage }) => {
    await api.createOk(validExpense({ description: 'To delete' }));
    await api.createOk(validExpense({ description: 'To keep' }));
    await expensePage.goto();
    await expensePage.deleteExpense('To delete');
    await expect(expensePage.rowFor('To delete')).toHaveCount(0);
    await expect(expensePage.rowFor('To keep')).toHaveCount(1);
  });

  test('TC-005: filter expenses by category', async ({ api, expensePage }) => {
    await api.createOk(validExpense({ categoryId: CATEGORY.Food, description: 'Groceries' }));
    await api.createOk(validExpense({ categoryId: CATEGORY.Travel, description: 'Taxi' }));
    await expensePage.goto();
    await expect(expensePage.rows).toHaveCount(2);
    await expensePage.filterBy({ category: 'Travel' });
    await expect(expensePage.rows).toHaveCount(1);
    await expect(expensePage.rowFor('Taxi')).toHaveCount(1);
  });

  test('TC-006: monthly summary shows total and category breakdown', async ({ api, expensePage }) => {
    await api.createOk(validExpense({ amount: 200, categoryId: CATEGORY.Food, expenseDate: today() }));
    await api.createOk(validExpense({ amount: 100, categoryId: CATEGORY.Bills, expenseDate: today() }));
    await expensePage.goto();
    await expect(expensePage.total).toHaveText('300.00');
    const chips = expensePage.page.getByTestId('summary-category');
    await expect(chips).toHaveCount(2);
    await expect(chips.first()).toContainText('Food: 200.00');
  });

  test('TC-007: sort by highest amount', async ({ api, expensePage }) => {
    await api.createOk(validExpense({ amount: 10, description: 'Small' }));
    await api.createOk(validExpense({ amount: 900, description: 'Large' }));
    await expensePage.goto();
    await expensePage.filterBy({ sort: 'amount_desc' });
    await expect(expensePage.rows.first()).toContainText('Large');
  });
});
