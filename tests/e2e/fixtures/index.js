const base = require('@playwright/test');
const { ExpensePage } = require('../pages/ExpensePage');
const { ExpenseClient } = require('../api/ExpenseClient');

const test = base.test.extend({
  api: async ({ request }, use) => { await use(new ExpenseClient(request)); },
  expensePage: async ({ page }, use) => { await use(new ExpensePage(page)); },
  // Auto fixture: every test starts with an empty expenses table.
  cleanDb: [async ({ api }, use) => { await api.reset(); await use(); }, { auto: true }],
});

module.exports = { test, expect: base.expect };
