const { DEFAULT_CATEGORIES } = require('./db');

const BASE = `SELECT e.id, e.user_id, e.amount, e.category_id, c.name AS category, e.description, e.expense_date
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
    userId: r.user_id,
    amount: r.amount,
    categoryId: r.category_id,
    category: r.category,
    description: r.description,
    expenseDate: r.expense_date,
  };

function createRepo(db) {
  function createUser({ email, passwordHash }) {
    const info = db
      .prepare('INSERT INTO users(email, password_hash) VALUES (?, ?)')
      .run(email, passwordHash);
    return findUserById(info.lastInsertRowid);
  }

  function findUserByEmail(email) {
    return db
      .prepare('SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?')
      .get(email) || null;
  }

  function findUserById(id) {
    return db
      .prepare('SELECT id, email, password_hash AS passwordHash FROM users WHERE id = ?')
      .get(id) || null;
  }

  function getExpense(userId, id) {
    return toExpense(db.prepare(`${BASE} WHERE e.user_id = ? AND e.id = ?`).get(userId, id)) || null;
  }

  function listExpenses(userId, { category, from, to, sort = 'date_desc' } = {}) {
    const where = ['e.user_id = ?'];
    const params = [userId];
    if (category) { where.push('e.category_id = ?'); params.push(category); }
    if (from) { where.push('e.expense_date >= ?'); params.push(from); }
    if (to) { where.push('e.expense_date <= ?'); params.push(to); }
    const sql = `${BASE} WHERE ${where.join(' AND ')} ORDER BY ${SORTS[sort] || SORTS.date_desc}`;
    return db.prepare(sql).all(...params).map(toExpense);
  }

  function createExpense(userId, d) {
    const info = db
      .prepare('INSERT INTO expenses(user_id, amount, category_id, description, expense_date) VALUES (?, ?, ?, ?, ?)')
      .run(userId, d.amount, d.categoryId, d.description ?? '', d.expenseDate);
    return getExpense(userId, info.lastInsertRowid);
  }

  function updateExpense(userId, id, d) {
    const info = db
      .prepare(
        'UPDATE expenses SET amount = ?, category_id = ?, description = ?, expense_date = ? WHERE user_id = ? AND id = ?'
      )
      .run(d.amount, d.categoryId, d.description ?? '', d.expenseDate, userId, id);
    return info.changes ? getExpense(userId, id) : null;
  }

  function deleteExpense(userId, id) {
    return db.prepare('DELETE FROM expenses WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
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

  function summary(userId, month) {
    const byCategory = db
      .prepare(
        `SELECT c.name AS category, ROUND(SUM(e.amount), 2) AS total, COUNT(*) AS count
         FROM expenses e JOIN categories c ON c.id = e.category_id
         WHERE e.user_id = ? AND substr(e.expense_date, 1, 7) = ?
         GROUP BY c.id ORDER BY total DESC`
      )
      .all(userId, month);
    const total = Math.round(byCategory.reduce((s, r) => s + r.total, 0) * 100) / 100;
    return { month, total, count: byCategory.reduce((s, r) => s + r.count, 0), byCategory };
  }

  function reset() {
    db.prepare('DELETE FROM expenses').run();
    const marks = DEFAULT_CATEGORIES.map(() => '?').join(',');
    db.prepare(`DELETE FROM categories WHERE name NOT IN (${marks})`).run(...DEFAULT_CATEGORIES);
  }

  return {
    createUser,
    findUserByEmail,
    findUserById,
    getExpense,
    listExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    listCategories,
    categoryExists,
    createCategory,
    summary,
    reset,
  };
}

module.exports = { createRepo };
