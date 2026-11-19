'use strict';
/**
 * Error classes + Express error-handling middleware.
 * Every failure is returned as: { error: string, details: [{ field, message }] }
 */
const { ZodError } = require('zod');
const config = require('../config');

class AppError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

/** Convert a ZodError into the API's `details` array. */
function zodDetails(err) {
  return err.issues.map((i) => ({
    field: i.path.join('.') || '(root)',
    message: i.message,
  }));
}

/** Catch-all for unknown routes (API only; static files are handled earlier). */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: zodDetails(err) });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Malformed JSON body (thrown by express.json())
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON body',
      details: [{ field: 'body', message: 'Request body is not valid JSON' }],
    });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'Request body too large', details: [] });
  }

  console.error('Unexpected error:', err);
  const message = config.nodeEnv === 'production' ? 'Internal server error' : `Internal server error: ${err && err.message}`;
  return res.status(500).json({ error: message, details: [] });
}

module.exports = { AppError, NotFoundError, notFoundHandler, errorHandler };
