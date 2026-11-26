const { expect } = require('@playwright/test');

class ExpensePage {
  constructor(page) {
    this.page = page;
    this.amount = page.getByTestId('amount-input');
    this.category = page.getByTestId('category-select');
    this.date = page.getByTestId('date-input');
    this.description = page.getByTestId('description-input');
    this.submitBtn = page.getByTestId('add-btn');
    this.cancelBtn = page.getByTestId('cancel-btn');
    this.formError = page.getByTestId('form-error');
    this.formTitle = page.getByTestId('form-title');
    this.rows = page.getByTestId('expense-row');
    this.emptyState = page.getByTestId('empty-state');
    this.total = page.getByTestId('summary-total');
    this.filterCategory = page.getByTestId('filter-category');
    this.filterFrom = page.getByTestId('filter-from');
    this.filterTo = page.getByTestId('filter-to');
    this.filterSort = page.getByTestId('filter-sort');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.locator('body[data-ready="true"]')).toBeAttached();
  }

  async fillForm({ amount, category, date, description }) {
    if (amount !== undefined) await this.amount.fill(String(amount));
    if (category) await this.category.selectOption({ label: category });
    if (date) await this.date.fill(date);
    if (description !== undefined) await this.description.fill(description);
  }

  async addExpense(data) {
    await this.fillForm(data);
    await this.submitBtn.click();
  }

  rowFor(text) { return this.rows.filter({ hasText: text }); }

  async editExpense(text, changes) {
    await this.rowFor(text).getByTestId('edit-btn').click();
    await this.fillForm(changes);
    await this.submitBtn.click();
  }

  async deleteExpense(text) {
    await this.rowFor(text).getByTestId('delete-btn').click();
  }

  async filterBy({ category, from, to, sort } = {}) {
    if (category) await this.filterCategory.selectOption({ label: category });
    if (from) await this.filterFrom.fill(from);
    if (to) await this.filterTo.fill(to);
    if (sort) await this.filterSort.selectOption(sort);
    await this.page.getByTestId('apply-filter').click();
  }
}

module.exports = { ExpensePage };
