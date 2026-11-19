'use strict';
/**
 * Central configuration, read from environment variables.
 * A local .env file (if present) is loaded first; real env vars win.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const rootDir = path.join(__dirname, '..');

module.exports = {
  rootDir,
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Resolved relative to the project root unless an absolute path is given
  dbPath: path.resolve(rootDir, process.env.DB_PATH || './db/expenses.db'),
  schemaPath: path.join(rootDir, 'db', 'schema.sql'),
  seedPath: path.join(rootDir, 'db', 'seed.sql'),
};
