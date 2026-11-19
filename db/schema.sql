-- Expense Tracker schema (idempotent)
CREATE TABLE IF NOT EXISTS expenses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  amount     REAL    NOT NULL CHECK (amount > 0),
  category   TEXT    NOT NULL CHECK (category IN
             ('Food','Transport','Shopping','Bills','Entertainment','Health','Other')),
  date       TEXT    NOT NULL,              -- ISO YYYY-MM-DD
  note       TEXT    CHECK (note IS NULL OR length(note) <= 255),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
