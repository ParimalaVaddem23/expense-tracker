const fs = require('fs');
const path = require('path');
const { createDb } = require('./db');
const { createRepo } = require('./repo');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'expenses.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const app = createApp(createRepo(createDb(DB_PATH)));
app.listen(PORT, () => {
  console.log(`Expense Tracker running at http://localhost:${PORT}`);
  console.log(`API docs at http://localhost:${PORT}/api-docs`);
});
