'use strict';
/**
 * SQLite connection (better-sqlite3). The database file and schema are
 * created automatically the first time the connection is requested.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

let db = null;

/** Open (and if needed create + initialise) the database. Singleton. */
function getDb() {
  if (db) return db;

  const isNew = !fs.existsSync(config.dbPath);
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema is idempotent, so running it on every start is safe; log only on creation.
  db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
  if (isNew) console.log(`Created new database at ${config.dbPath}`);

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
