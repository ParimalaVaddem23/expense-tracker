const expenseInput = {
  type: 'object',
  required: ['amount', 'categoryId', 'expenseDate'],
  properties: {
    amount: { type: 'number', exclusiveMinimum: 0, example: 250 },
    categoryId: { type: 'integer', example: 1 },
    description: { type: 'string', maxLength: 200, example: 'Lunch' },
    expenseDate: { type: 'string', format: 'date', example: '2026-11-20' },
  },
};
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const err = (d) => ({ description: d, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const json = (ref) => ({ 'application/json': { schema: ref } });
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });

module.exports = {
  openapi: '3.0.3',
  info: { title: 'Expense Tracker API', version: '1.0.0' },
  paths: {
    '/api/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
    '/api/expenses': {
      get: {
        summary: 'List expenses',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'integer' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'] } },
        ],
        responses: { 200: { description: 'List', content: json({ type: 'array', items: ref('Expense') }) }, 400: err('Validation error') },
      },
      post: {
        summary: 'Create expense',
        requestBody: { required: true, content: json(ref('ExpenseInput')) },
        responses: { 201: { description: 'Created', content: json(ref('Expense')) }, 400: err('Validation error') },
      },
    },
    '/api/expenses/{id}': {
      get: { summary: 'Get expense', parameters: [idParam], responses: { 200: { description: 'Expense', content: json(ref('Expense')) }, 404: err('Not found') } },
      put: {
        summary: 'Update expense',
        parameters: [idParam],
        requestBody: { required: true, content: json(ref('ExpenseInput')) },
        responses: { 200: { description: 'Updated', content: json(ref('Expense')) }, 400: err('Validation error'), 404: err('Not found') },
      },
      delete: { summary: 'Delete expense', parameters: [idParam], responses: { 204: { description: 'Deleted' }, 404: err('Not found') } },
    },
    '/api/categories': {
      get: { summary: 'List categories', responses: { 200: { description: 'List' } } },
      post: {
        summary: 'Create category',
        requestBody: { required: true, content: json({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } }) },
        responses: { 201: { description: 'Created' }, 400: err('Validation error'), 409: err('Duplicate') },
      },
    },
    '/api/summary': {
      get: {
        summary: 'Monthly summary',
        parameters: [{ name: 'month', in: 'query', required: true, schema: { type: 'string', example: '2026-11' } }],
        responses: { 200: { description: 'Summary' }, 400: err('Validation error') },
      },
    },
  },
  components: {
    schemas: {
      ExpenseInput: expenseInput,
      Expense: {
        type: 'object',
        properties: { ...expenseInput.properties, id: { type: 'integer' }, category: { type: 'string' } },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
    },
  },
};
