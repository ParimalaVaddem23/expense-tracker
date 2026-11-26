const { DEFAULT_CATEGORIES } = require('./db');

const BASE = `SELECT e.id, e.amount, e.category_id, c.name AS category, e.description, e.expense_date
              FROM expenses e JOIN categories c ON c.id = e.category_id`;
const SORTS = {
  date_desc: 'e.expense_date DESC, e.id DESC',
  date_asc: 'e.expense_date ASC, e.id ASC',
  amount_desc: 'e.amount DESC, e.id DESC',
  amount_asc: 'e.amount ASC, e.id ASC',
};

const toExpense = (r) =>
  r && {
    id: r.id,
    amount: r.amount,
    categoryId: r.category_id,
    category: r.category,
    description: r.description,
    expenseDate: r.expense_date,
  };

function createRepo(db) {
  function getExpense(id) {
    return toExpense(db.prepare(`${BASE} WHERE e.id = ?`).get(id)) || null;
  }

  function listExpenses({ category, from, to, sort = 'date_desc' } = {}) {
    const where = [];
    const params = [];
    if (category) { where.push('e.category_id = ?'); params.push(category); }
    if (from) { where.push('e.expense_date >= ?'); params.push(from); }
    if (to) { where.push('e.expense_date <= ?'); params.push(to); }
    const sql = `${BASE}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${SORTS[sort] || SORTS.date_desc}`;
    return db.prepare(sql).all(...params).map(toExpense);
  }

  function createExpense(d) {
    const info = db
      .prepare('INSERT INTO expenses(amount, category_id, description, expense_date) VALUES (?, ?, ?, ?)')
      .run(d.amount, d.categoryId, d.description ?? '', d.expenseDate);
    return getExpense(info.lastInsertRowid);
  }

  function updateExpense(id, d) {
    const info = db
      .prepare('UPDATE expenses SET amount = ?, category_id = ?, description = ?, expense_date = ? WHERE id = ?')
      .run(d.amount, d.categoryId, d.description ?? '', d.expenseDate, id);
    return info.changes ? getExpense(id) : null;
  }

  function deleteExpense(id) {
    return db.prepare('DELETE FROM expenses WHERE id = ?').run(id).changes > 0;
  }

  function listCategories() {
    return db.prepare('SELECT id, name FROM categories ORDER BY id').all();
  }

  function categoryExists(id) {
    return !!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
  }

  function createCategory(name) {
    const info = db.prepare('INSERT INTO categories(name) VALUES (?)').run(name);
    return { id: Number(info.lastInsertRowid), name };
  }

  function summary(month) {
    const byCategory = db
      .prepare(
        `SELECT c.name AS category, ROUND(SUM(e.amount), 2) AS total, COUNT(*) AS count
         FROM expenses e JOIN categories c ON c.id = e.category_id
         WHERE substr(e.expense_date, 1, 7) = ?
         GROUP BY c.id ORDER BY total DESC`
      )
      .all(month);
    const total = Math.round(byCategory.reduce((s, r) => s + r.total, 0) * 100) / 100;
    return { month, total, count: byCategory.reduce((s, r) => s + r.count, 0), byCategory };
  }

  function reset() {
    db.prepare('DELETE FROM expenses').run();
    const marks = DEFAULT_CATEGORIES.map(() => '?').join(',');
    db.prepare(`DELETE FROM categories WHERE name NOT IN (${marks})`).run(...DEFAULT_CATEGORIES);
  }

  return { getExpense, listExpenses, createExpense, updateExpense, deleteExpense, listCategories, categoryExists, createCategory, summary, reset };
}

module.exports = { createRepo };
