'use strict';
const express = require('express');
const service = require('../services/expenseService');
const { filterSchema } = require('../schemas/expenseSchema');
const { cleanQuery } = require('./expenses');

const router = express.Router();

router.get('/', (req, res) => {
  const filters = filterSchema.parse(cleanQuery(req.query));
  res.json(service.summary(filters));
});

module.exports = router;
