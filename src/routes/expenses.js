'use strict';
const express = require('express');
const service = require('../services/expenseService');
const { expenseSchema, filterSchema, idSchema } = require('../schemas/expenseSchema');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

/** Parse :id, turning bad input into a 400 with the standard error shape. */
function parseId(raw) {
  const r = idSchema.safeParse(raw);
  if (!r.success) {
    throw new AppError(400, 'Validation failed', [{ field: 'id', message: r.error.issues[0].message }]);
  }
  return r.data;
}

/** Drop empty-string query params (e.g. ?category=&from=) before validating. */
function cleanQuery(query) {
  const out = {};
  for (const key of ['category', 'from', 'to']) {
    if (typeof query[key] === 'string' && query[key] !== '') out[key] = query[key];
    else if (query[key] !== undefined && typeof query[key] !== 'string') out[key] = query[key]; // arrays etc. -> fail validation
  }
  return out;
}

router.post('/', (req, res) => {
  const data = expenseSchema.parse(req.body);
  res.status(201).json(service.create(data));
});

router.get('/', (req, res) => {
  const filters = filterSchema.parse(cleanQuery(req.query));
  res.json(service.list(filters));
});

router.get('/:id', (req, res) => {
  res.json(service.getById(parseId(req.params.id)));
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const data = expenseSchema.parse(req.body);
  res.json(service.update(id, data));
});

router.delete('/:id', (req, res) => {
  service.remove(parseId(req.params.id));
  res.status(204).end();
});

module.exports = { router, cleanQuery };
