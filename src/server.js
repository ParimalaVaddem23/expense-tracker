const fs = require('fs');
const path = require('path');
const { createDb } = require('./db');
const { createRepo } = require('./repo');
const { createApp } = require('./app');
const { getConfigFromEnv, validateConfig } = require('./config');

const config = getConfigFromEnv();
validateConfig(config);

if (!config.JWT_SECRET || config.JWT_SECRET.length < 16) {
  // Refuse to start if the JWT secret is missing or too short.
  // (Length threshold is a reasonable minimum to avoid trivial secrets.)
  throw new Error('Invalid configuration: JWT_SECRET is required and must be at least 16 characters.');
}

const PORT = Number(config.PORT) || 3000;
const DB_PATH = config.DB_PATH || path.join(__dirname, '..', 'data', 'expenses.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const app = createApp(createRepo(createDb(DB_PATH)));
app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
});
