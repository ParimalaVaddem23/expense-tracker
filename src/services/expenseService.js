'use strict';
/**
 * Data-access / business logic for expenses. Routes never touch SQL directly.
 */
const { getDb } = require('../db/connection');
const { NotFoundError } = require('../middleware/errorHandler');

const COLUMNS = 'id, title, amount, category, date, note, created_at, updated_at';

/** Round to 2 decimals to hide floating-point noise in sums. */
const round2 = (n) => Math.round(n * 100) / 100;

/** Build a WHERE clause from the optional category/from/to filters. */
function buildWhere({ category, from, to } = {}) {
  const clauses = [];
  const params = [];
  if (category) { clauses.push('category = ?'); params.push(category); }
  if (from) { clauses.push('date >= ?'); params.push(from); }
  if (to) { clauses.push('date <= ?'); params.push(to); }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function findById(id) {
  return getDb().prepare(`SELECT ${COLUMNS} FROM expenses WHERE id = ?`).get(id);
}

function getById(id) {
  const row = findById(id);
  if (!row) throw new NotFoundError(`Expense ${id} not found`);
  return row;
}

function list(filters) {
  const { where, params } = buildWhere(filters);
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM expenses ${where} ORDER BY date DESC, id DESC`)
    .all(...params);
}

function create(data) {
  const info = getDb()
    .prepare('INSERT INTO expenses (title, amount, category, date, note) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, data.amount, data.category, data.date, data.note ?? null);
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  getById(id); // 404 if missing
  getDb()
    .prepare(
      `UPDATE expenses
          SET title = ?, amount = ?, category = ?, date = ?, note = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ?`
    )
    .run(data.title, data.amount, data.category, data.date, data.note ?? null, id);
  return getById(id);
}

function remove(id) {
  const info = getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id);
  if (info.changes === 0) throw new NotFoundError(`Expense ${id} not found`);
}

/** { total, count, byCategory: [{ category, total, count }] } for the given filters. */
function summary(filters) {
  const { where, params } = buildWhere(filters);
  const db = getDb();
  const totals = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM expenses ${where}`)
    .get(...params);
  const byCategory = db
    .prepare(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
         FROM expenses ${where}
        GROUP BY category
        ORDER BY total DESC, category ASC`
    )
    .all(...params)
    .map((r) => ({ category: r.category, total: round2(r.total), count: r.count }));

  return { total: round2(totals.total), count: totals.count, byCategory };
}

/** Insert many expenses atomically (all or nothing). */
function seed(expenses) {
  const db = getDb();
  const insert = db.prepare('INSERT INTO expenses (title, amount, category, date, note) VALUES (?, ?, ?, ?, ?)');
  const run = db.transaction((items) =>
    items.map((e) => insert.run(e.title, e.amount, e.category, e.date, e.note ?? null).lastInsertRowid)
  );
  const ids = run(expenses);
  return ids.map(getById);
}

/** Delete everything and restart AUTOINCREMENT numbering at 1. */
function reset() {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM expenses').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'expenses'").run();
  })();
}

module.exports = { list, getById, create, update, remove, summary, seed, reset };
