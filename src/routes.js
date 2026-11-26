const express = require('express');
const { expenseSchema, categorySchema, listQuerySchema, summaryQuerySchema } = require('./schemas');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      error: 'ValidationError',
      details: result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  req.valid = { ...(req.valid || {}), [source]: result.data };
  next();
};

const notFound = (res, what = 'Expense') => res.status(404).json({ error: 'NotFound', message: `${what} not found` });
const badCategory = (res) =>
  res.status(400).json({ error: 'ValidationError', details: [{ field: 'categoryId', message: 'Category does not exist' }] });

function createRouter(repo) {
  const r = express.Router();

  r.get('/health', (req, res) => res.json({ status: 'ok' }));

  r.get('/expenses', validate(listQuerySchema, 'query'), (req, res) => res.json(repo.listExpenses(req.valid.query)));

  r.get('/expenses/:id', (req, res) => {
    const e = /^\d+$/.test(req.params.id) ? repo.getExpense(Number(req.params.id)) : null;
    return e ? res.json(e) : notFound(res);
  });

  r.post('/expenses', validate(expenseSchema), (req, res) => {
    if (!repo.categoryExists(req.valid.body.categoryId)) return badCategory(res);
    res.status(201).json(repo.createExpense(req.valid.body));
  });

  r.put('/expenses/:id', validate(expenseSchema), (req, res) => {
    if (!repo.categoryExists(req.valid.body.categoryId)) return badCategory(res);
    const e = /^\d+$/.test(req.params.id) ? repo.updateExpense(Number(req.params.id), req.valid.body) : null;
    return e ? res.json(e) : notFound(res);
  });

  r.delete('/expenses/:id', (req, res) => {
    const ok = /^\d+$/.test(req.params.id) && repo.deleteExpense(Number(req.params.id));
    return ok ? res.status(204).end() : notFound(res);
  });

  r.get('/categories', (req, res) => res.json(repo.listCategories()));

  r.post('/categories', validate(categorySchema), (req, res, next) => {
    try {
      res.status(201).json(repo.createCategory(req.valid.body.name));
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'Conflict', message: 'Category already exists' });
      }
      next(err);
    }
  });

  r.get('/summary', validate(summaryQuerySchema, 'query'), (req, res) => res.json(repo.summary(req.valid.query.month)));

  if (process.env.NODE_ENV === 'test') {
    r.delete('/test/reset', (req, res) => { repo.reset(); res.status(204).end(); });
  }

  return r;
}

module.exports = { createRouter };
