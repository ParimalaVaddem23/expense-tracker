'use strict';
// npm run db:init - creates the database file from db/schema.sql
const config = require('../src/config');
const { getDb, closeDb } = require('../src/db/connection');

getDb();
closeDb();
console.log(`Database ready at ${config.dbPath}`);
