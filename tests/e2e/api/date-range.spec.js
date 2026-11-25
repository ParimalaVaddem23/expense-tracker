const { test, expect } = require('@playwright/test');
const { resetAndSeed } = require('../helpers/testData');

test.describe('API date-range validation', () => {
  test.beforeEach(async ({ request }) => {
    await resetAndSeed(request);
  });

  test('GET /api/expenses returns 400 when from > to', async ({ request }) => {
    const res = await request.get(
      '/api/expenses?from=2026-12-31&to=2026-01-01'
    );

    expect(res.status()).toBe(400);
    const body = await res.json();

    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
    expect(Array.isArray(body.details)).toBe(true);
    expect(JSON.stringify(body.details).toLowerCase()).toContain('from');
  });

  test('GET /api/expenses returns 200 when from <= to', async ({ request }) => {
    const res = await request.get(
      '/api/expenses?from=2026-01-01&to=2026-12-31'
    );

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/summary returns 400 when from > to', async ({ request }) => {
    const res = await request.get('/api/summary?from=2026-12-31&to=2026-01-01');

    expect(res.status()).toBe(400);
    const body = await res.json();

    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
    expect(Array.isArray(body.details)).toBe(true);
    expect(JSON.stringify(body.details).toLowerCase()).toContain('from');
  });

  test('GET /api/summary returns 200 when from <= to', async ({ request }) => {
    const res = await request.get('/api/summary?from=2026-01-01&to=2026-12-31');

    expect(res.status()).toBe(200);
    const body = await res.json();
    // Summary is expected to be an object with totals
    expect(body).toBeTruthy();
    expect(typeof body).toBe('object');
  });
});
