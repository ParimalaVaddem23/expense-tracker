const Database = require('better-sqlite3');

const DEFAULT_CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Other'];

const LEGACY_USER_EMAIL = 'legacy@expense-tracker.local';
// Fixed, intentionally invalid bcrypt hash string (NOT a valid bcrypt hash).
const LEGACY_USER_PASSWORD_HASH = 'NOT_A_VALID_BCRYPT_HASH';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

/**
 * Legacy-compatible base schema:
 * - Create expenses WITHOUT user_id so db.exec(SCHEMA) works against legacy DBs.
 * - A startup migration will add/backfill/enforce expenses.user_id when missing.
 */
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

function tableHasColumn(db, tableName, columnName) {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return cols.some((c) => c.name === columnName);
}

function ensureLegacyUser(db) {
  db.prepare(
    'INSERT OR IGNORE INTO users(email, password_hash) VALUES (?, ?)',
  ).run(LEGACY_USER_EMAIL, LEGACY_USER_PASSWORD_HASH);

  const row = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(LEGACY_USER_EMAIL);

  return row.id;
}

function migrateLegacyExpensesToUserId(db) {
  // Idempotent: only run if the legacy schema is detected.
  if (tableHasColumn(db, 'expenses', 'user_id')) {
    // Ensure index exists for DBs created after migration code was added/changed.
    db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);');
    return;
  }

  const legacyUserId = ensureLegacyUser(db);

  // SQLite cannot add a NOT NULL column without a DEFAULT, so:
  // 1) Add nullable user_id
  // 2) Backfill
  // 3) Rebuild table with NOT NULL constraint
  db.exec('ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id);');
  db.prepare('UPDATE expenses SET user_id = ? WHERE user_id IS NULL').run(legacyUserId);

  const inTx = db.transaction(() => {
    // Safely preserve and restore FK enforcement state.
    const { foreign_keys: foreignKeysOn } = db.prepare('PRAGMA foreign_keys').get();

    try {
      db.exec('PRAGMA foreign_keys = OFF;');

      db.exec(`
        CREATE TABLE expenses_new (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          amount       REAL NOT NULL CHECK (amount > 0),
          category_id  INTEGER NOT NULL REFERENCES categories(id),
          user_id      INTEGER NOT NULL REFERENCES users(id),
          description  TEXT NOT NULL DEFAULT '',
          expense_date TEXT NOT NULL,
          created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      db.exec(`
        INSERT INTO expenses_new (id, amount, category_id, user_id, description, expense_date, created_at)
        SELECT id, amount, category_id, user_id, description, expense_date, created_at
        FROM expenses;
      `);

      db.exec('DROP TABLE expenses;');
      db.exec('ALTER TABLE expenses_new RENAME TO expenses;');

      db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);');
      db.exec('CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);');
    } finally {
      db.exec(`PRAGMA foreign_keys = ${foreignKeysOn ? 'ON' : 'OFF'};`);
      // If FK enforcement is ON, validate constraints after rebuild.
      if (foreignKeysOn) db.exec('PRAGMA foreign_key_check;');
    }
  });

  inTx();
}

function createDb(path = ':memory:') {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');

  // Create legacy-compatible base schema; if expenses is legacy, migration will adjust it.
  db.exec(SCHEMA);

  // Startup migration: add expenses.user_id, backfill legacy rows, enforce NOT NULL.
  migrateLegacyExpensesToUserId(db);

  const insert = db.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)');
  DEFAULT_CATEGORIES.forEach((c) => insert.run(c));

  return db;
}

module.exports = { createDb, DEFAULT_CATEGORIES };
