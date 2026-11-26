// Seeded categories are created in this order, so ids are stable on a fresh DB.
const CATEGORY = { Food: 1, Travel: 2, Bills: 3, Shopping: 4, Health: 5, Other: 6 };

const pad = (n) => String(n).padStart(2, '0');
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validExpense(overrides = {}) {
  return { amount: 100, categoryId: CATEGORY.Food, description: 'Test expense', expenseDate: today(), ...overrides };
}

module.exports = { CATEGORY, today, validExpense };
