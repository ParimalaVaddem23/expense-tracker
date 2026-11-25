'use strict';
/**
 * OpenAPI 3.0 specification served by swagger-ui-express at /api-docs.
 */
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const idParam = {
  name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'Expense id',
};

const filterParams = [
  { name: 'category', in: 'query', required: false, schema: { type: 'string', enum: CATEGORIES } },
  { name: 'from', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Inclusive start date (YYYY-MM-DD). When both "from" and "to" are provided, "from" must not be after "to".' },
  { name: 'to', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Inclusive end date (YYYY-MM-DD). When both "from" and "to" are provided, "from" must not be after "to".' },
];

const jsonBody = (ref) => ({ required: true, content: { 'application/json': { schema: { $ref: ref } } } });
const jsonOk = (description, ref) => ({ description, content: { 'application/json': { schema: { $ref: ref } } } });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Expense Tracker API',
    version: '1.0.0',
    description: 'Simple REST API for tracking personal expenses.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Expenses' }, { name: 'Summary' }, { name: 'Health' },
    { name: 'Test data', description: 'Only available when NODE_ENV is not "production" (404 otherwise).' },
  ],
  paths: {
    '/api/expenses': {
      post: {
        tags: ['Expenses'], summary: 'Create an expense',
        requestBody: jsonBody('#/components/schemas/ExpenseInput'),
        responses: { 201: jsonOk('Created', '#/components/schemas/Expense'), 400: errorResponse('Validation error'), 500: errorResponse('Unexpected error') },
      },
      get: {
        tags: ['Expenses'], summary: 'List expenses (date desc, then id desc)',
        parameters: filterParams,
        responses: {
          200: { description: 'List of expenses', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } } },
          400: errorResponse('Validation error'), 500: errorResponse('Unexpected error'),
        },
      },
    },
    '/api/expenses/{id}': {
      get: {
        tags: ['Expenses'], summary: 'Get one expense', parameters: [idParam],
        responses: { 200: jsonOk('The expense', '#/components/schemas/Expense'), 400: errorResponse('Invalid id'), 404: errorResponse('Not found'), 500: errorResponse('Unexpected error') },
      },
      put: {
        tags: ['Expenses'], summary: 'Replace an expense (full update)', parameters: [idParam],
        requestBody: jsonBody('#/components/schemas/ExpenseInput'),
        responses: { 200: jsonOk('Updated expense', '#/components/schemas/Expense'), 400: errorResponse('Validation error'), 404: errorResponse('Not found'), 500: errorResponse('Unexpected error') },
      },
      delete: {
        tags: ['Expenses'], summary: 'Delete an expense', parameters: [idParam],
        responses: { 204: { description: 'Deleted' }, 400: errorResponse('Invalid id'), 404: errorResponse('Not found'), 500: errorResponse('Unexpected error') },
      },
    },
    '/api/summary': {
      get: {
        tags: ['Summary'], summary: 'Totals and per-category breakdown (honours category/from/to)',
        parameters: filterParams,
        responses: { 200: jsonOk('Summary', '#/components/schemas/Summary'), 400: errorResponse('Validation error'), 500: errorResponse('Unexpected error') },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'], summary: 'Health check',
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
      },
    },
    '/api/test-data/seed': {
      post: {
        tags: ['Test data'], summary: 'Insert many expenses in one transaction',
        requestBody: jsonBody('#/components/schemas/SeedRequest'),
        responses: {
          201: { description: 'Inserted', content: { 'application/json': { schema: { type: 'object', properties: { inserted: { type: 'integer' }, expenses: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } } } } },
          400: errorResponse('Validation error (nothing inserted)'), 404: errorResponse('Disabled in production'),
        },
      },
    },
    '/api/test-data/reset': {
      delete: {
        tags: ['Test data'], summary: 'Delete all expenses and reset the id sequence',
        responses: { 204: { description: 'Reset done' }, 404: errorResponse('Disabled in production') },
      },
    },
  },
  components: {
    schemas: {
      ExpenseInput: {
        type: 'object',
        required: ['title', 'amount', 'category', 'date'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100, example: 'Lunch' },
          amount: { type: 'number', exclusiveMinimum: true, minimum: 0, multipleOf: 0.01, example: 12.5 },
          category: { type: 'string', enum: CATEGORIES, example: 'Food' },
          date: { type: 'string', format: 'date', description: 'YYYY-MM-DD, not in the future', example: '2025-01-15' },
          note: { type: 'string', maxLength: 255, nullable: true, example: 'With colleagues' },
        },
      },
      Expense: {
        allOf: [
          { $ref: '#/components/schemas/ExpenseInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Summary: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 123.45 },
          count: { type: 'integer', example: 4 },
          byCategory: {
            type: 'array',
            items: {
              type: 'object',
              properties: { category: { type: 'string', enum: CATEGORIES }, total: { type: 'number' }, count: { type: 'integer' } },
            },
          },
        },
      },
      SeedRequest: {
        type: 'object', required: ['expenses'],
        properties: { expenses: { type: 'array', items: { $ref: '#/components/schemas/ExpenseInput' } } },
      },
      Error: {
        type: 'object',
        required: ['error', 'details'],
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string', example: 'title' }, message: { type: 'string', example: 'Title is required' } } },
          },
        },
      },
    },
  },
};