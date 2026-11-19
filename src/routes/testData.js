'use strict';
/**
 * Test-data helpers. Every route here answers 404 when NODE_ENV === "production".
 */
const express = require('express');
const config = require('../config');
const service = require('../services/expenseService');
const { seedSchema } = require('../schemas/expenseSchema');
const { NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Disabled in production: behave exactly as if the route did not exist.
router.use((req, res, next) => {
  if (config.nodeEnv === 'production') {
    return next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  }
  return next();
});

router.post('/seed', (req, res) => {
  const { expenses } = seedSchema.parse(req.body); // validates every item before anything is inserted
  const inserted = service.seed(expenses);
  res.status(201).json({ inserted: inserted.length, expenses: inserted });
});

router.delete('/reset', (req, res) => {
  service.reset();
  res.status(204).end();
});

module.exports = router;
