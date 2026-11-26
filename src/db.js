const Database = require('better-sqlite3');

const DEFAULT_CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Other'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  amount       REAL NOT NULL CHECK (amount > 0),
  category_id  INTEGER NOT NULL REFERENCES categories(id),
  description  TEXT NOT NULL DEFAULT '',
  expense_date TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
`;

function createDb(path = ':memory:') {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  const insert = db.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)');
  DEFAULT_CATEGORIES.forEach((c) => insert.run(c));
  return db;
}

module.exports = { createDb, DEFAULT_CATEGORIES };
