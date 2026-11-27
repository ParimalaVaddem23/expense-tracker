const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authRequired } = require('./authMiddleware');
const {
  expenseSchema,
  categorySchema,
  listQuerySchema,
  summaryQuerySchema,
  registerSchema,
  loginSchema,
} = require('./schemas');

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

const TOKEN_COOKIE_NAME = 'auth_token';
const TOKEN_MAX_AGE_SECONDS = 3600;

const legacyUserBlocked = (user) => user?.email === 'legacy@expense-tracker.local';

function setAuthCookie(req, res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE_SECONDS * 1000,
    secure: req.secure === true,
  });
}

function clearAuthCookie(req, res) {
  res.cookie(TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: req.secure === true,
  });
}

function createRouter(repo) {
  const r = express.Router();

  r.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Auth routes under /api/auth/*
  r.post('/auth/register', validate(registerSchema), (req, res, next) => {
    try {
      const { email, password } = req.valid.body;
      const passwordHash = bcrypt.hashSync(password, 10);
      const user = repo.createUser({ email, passwordHash });

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
        subject: String(user.id),
      });

      // Jira/plan implies login cookie should be set on successful registration
      setAuthCookie(req, res, token);
      return res.status(201).json({ id: user.id, email: user.email });
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'Conflict', message: 'User already exists' });
      }
      next(err);
    }
  });

  r.post('/auth/login', validate(loginSchema), (req, res, next) => {
    try {
      const { email, password } = req.valid.body;
      const user = repo.findUserByEmail(email);

      const ok = user && bcrypt.compareSync(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      }
      if (legacyUserBlocked(user)) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
        subject: String(user.id),
      });

      setAuthCookie(req, res, token);
      return res.json({ id: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  });

  r.get('/auth/me', authRequired, (req, res) => {
    if (legacyUserBlocked(req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ id: req.user.id, email: req.user.email });
  });

  r.post('/auth/logout', (req, res) => {
    clearAuthCookie(req, res);
    return res.status(204).end();
  });

  // Protected API
  r.get('/expenses', authRequired, validate(listQuerySchema, 'query'), (req, res) =>
    res.json(repo.listExpenses(req.user.id, req.valid.query))
  );

  r.get('/expenses/:id', authRequired, (req, res) => {
    const e = /^\d+$/.test(req.params.id) ? repo.getExpense(req.user.id, Number(req.params.id)) : null;
    return e ? res.json(e) : notFound(res);
  });

  r.post('/expenses', authRequired, validate(expenseSchema), (req, res) => {
    if (!repo.categoryExists(req.valid.body.categoryId)) return badCategory(res);
    res.status(201).json(repo.createExpense(req.user.id, req.valid.body));
  });

  r.put('/expenses/:id', authRequired, validate(expenseSchema), (req, res) => {
    if (!repo.categoryExists(req.valid.body.categoryId)) return badCategory(res);
    const e = /^\d+$/.test(req.params.id) ? repo.updateExpense(req.user.id, Number(req.params.id), req.valid.body) : null;
    return e ? res.json(e) : notFound(res);
  });

  r.delete('/expenses/:id', authRequired, (req, res) => {
    const ok = /^\d+$/.test(req.params.id) && repo.deleteExpense(req.user.id, Number(req.params.id));
    return ok ? res.status(204).end() : notFound(res);
  });

  r.get('/categories', authRequired, (req, res) => res.json(repo.listCategories()));

  r.post('/categories', authRequired, validate(categorySchema), (req, res, next) => {
    try {
      res.status(201).json(repo.createCategory(req.valid.body.name));
    } catch (err) {
      if (String(err.code).startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'Conflict', message: 'Category already exists' });
      }
      next(err);
    }
  });

  r.get('/summary', authRequired, validate(summaryQuerySchema, 'query'), (req, res) =>
    res.json(repo.summary(req.user.id, req.valid.query.month))
  );

  if (process.env.NODE_ENV === 'test') {
    // Keep public in test env only
    r.delete('/test/reset', (req, res) => {
      repo.reset();
      res.status(204).end();
    });
  }

  return r;
}

module.exports = { createRouter };
