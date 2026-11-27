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

    '/api/auth/register': {
      post: {
        summary: 'Register',
        requestBody: { required: true, content: json(ref('AuthInput')) },
        responses: {
          201: { description: 'Registered', content: json(ref('User')) },
          400: err('Validation error'),
          409: err('Conflict'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        requestBody: { required: true, content: json(ref('AuthInput')) },
        responses: {
          200: {
            description: 'Logged in',
            headers: {
              'Set-Cookie': {
                description: 'auth_token cookie',
                schema: { type: 'string', example: 'auth_token=...; Path=/; HttpOnly; SameSite=Lax' },
              },
            },
            content: json(ref('User')),
          },
          400: err('Validation error'),
          401: err('Unauthorized'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Current user',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'Me', content: json(ref('User')) }, 401: err('Unauthorized') },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        responses: {
          204: {
            description: 'Logged out',
            headers: {
              'Set-Cookie': {
                description: 'Clears auth_token cookie',
                schema: { type: 'string', example: 'auth_token=; Path=/; HttpOnly; Max-Age=0' },
              },
            },
          },
        },
      },
    },

    '/api/expenses': {
      get: {
        summary: 'List expenses',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'integer' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'] } },
        ],
        responses: {
          200: { description: 'List', content: json({ type: 'array', items: ref('Expense') }) },
          400: err('Validation error'),
          401: err('Unauthorized'),
        },
      },
      post: {
        summary: 'Create expense',
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: json(ref('ExpenseInput')) },
        responses: {
          201: { description: 'Created', content: json(ref('Expense')) },
          400: err('Validation error'),
          401: err('Unauthorized'),
        },
      },
    },
    '/api/expenses/{id}': {
      get: {
        summary: 'Get expense',
        security: [{ cookieAuth: [] }],
        parameters: [idParam],
        responses: {
          200: { description: 'Expense', content: json(ref('Expense')) },
          401: err('Unauthorized'),
          404: err('Not found'),
        },
      },
      put: {
        summary: 'Update expense',
        security: [{ cookieAuth: [] }],
        parameters: [idParam],
        requestBody: { required: true, content: json(ref('ExpenseInput')) },
        responses: {
          200: { description: 'Updated', content: json(ref('Expense')) },
          400: err('Validation error'),
          401: err('Unauthorized'),
          404: err('Not found'),
        },
      },
      delete: {
        summary: 'Delete expense',
        security: [{ cookieAuth: [] }],
        parameters: [idParam],
        responses: { 204: { description: 'Deleted' }, 401: err('Unauthorized'), 404: err('Not found') },
      },
    },
    '/api/categories': {
      get: {
        summary: 'List categories',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: 'List' }, 401: err('Unauthorized') },
      },
      post: {
        summary: 'Create category',
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: json({ type: 'object', required: ['name'], properties: { name: { type: 'string' } } }) },
        responses: { 201: { description: 'Created' }, 400: err('Validation error'), 401: err('Unauthorized'), 409: err('Duplicate') },
      },
    },
    '/api/summary': {
      get: {
        summary: 'Monthly summary',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'month', in: 'query', required: true, schema: { type: 'string', example: '2026-11' } }],
        responses: { 200: { description: 'Summary' }, 400: err('Validation error'), 401: err('Unauthorized') },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth_token' },
    },
    schemas: {
      ExpenseInput: expenseInput,
      Expense: {
        type: 'object',
        properties: { ...expenseInput.properties, id: { type: 'integer' }, category: { type: 'string' } },
      },
      AuthInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'password123' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
        },
        additionalProperties: false,
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
        additionalProperties: true,
      },
    },
  },
};
