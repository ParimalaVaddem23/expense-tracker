'use strict';
// npm run db:seed - loads db/seed.sql sample data (adds rows; run db:init on a fresh file for a clean start)
const fs = require('fs');
const config = require('../src/config');
const { getDb, closeDb } = require('../src/db/connection');

const db = getDb();
db.exec(fs.readFileSync(config.seedPath, 'utf8'));
const { n } = db.prepare('SELECT COUNT(*) AS n FROM expenses').get();
closeDb();
console.log(`Seed data loaded. Expenses in database: ${n}`);
