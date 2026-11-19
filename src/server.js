'use strict';
/**
 * Entry point: opens the database (creating it on first run) and starts listening.
 */
const app = require('./app');
const config = require('./config');
const { getDb, closeDb } = require('./db/connection');

getDb(); // initialise DB (creates file + schema if missing)

const server = app.listen(config.port, () => {
  console.log(`Expense Tracker running on http://localhost:${config.port} [${config.nodeEnv}]`);
  console.log(`API docs: http://localhost:${config.port}/api-docs`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
