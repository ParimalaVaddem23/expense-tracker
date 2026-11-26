const { test, expect } = require('../fixtures');
const { validExpense, CATEGORY } = require('../helpers/dataFactory');

test.describe('Expenses API', () => {
  test('TC-101: health endpoint responds @smoke', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  test('TC-102: create expense returns 201 and the saved record @smoke', async ({ api }) => {
    const res = await api.create(validExpense({ amount: 250.5, description: 'Lunch' }));
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ amount: 250.5, category: 'Food', description: 'Lunch' });
    expect(body.id).toBeGreaterThan(0);
  });

  test('TC-103: negative amount is rejected with a field error', async ({ api }) => {
    const res = await api.create(validExpense({ amount: -5 }));
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('ValidationError');
    expect(body.details[0]).toMatchObject({ field: 'amount' });
  });

  test('TC-104: missing date is rejected', async ({ api }) => {
    const { expenseDate, ...noDate } = validExpense();
    const res = await api.create(noDate);
    expect(res.status()).toBe(400);
  });

  test('TC-105: unknown category is rejected', async ({ api }) => {
    const res = await api.create(validExpense({ categoryId: 9999 }));
    expect(res.status()).toBe(400);
    expect((await res.json()).details[0].field).toBe('categoryId');
  });

  test('TC-106: get by id, and 404 for unknown id', async ({ api }) => {
    const created = await api.createOk(validExpense());
    expect((await api.get(created.id)).status()).toBe(200);
    expect((await api.get(999999)).status()).toBe(404);
  });

  test('TC-107: update an expense', async ({ api }) => {
    const created = await api.createOk(validExpense());
    const res = await api.update(created.id, validExpense({ amount: 999, categoryId: CATEGORY.Travel }));
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ amount: 999, category: 'Travel' });
  });

  test('TC-108: delete returns 204 then 404', async ({ api }) => {
    const created = await api.createOk(validExpense());
    expect((await api.remove(created.id)).status()).toBe(204);
    expect((await api.get(created.id)).status()).toBe(404);
    expect((await api.remove(created.id)).status()).toBe(404);
  });

  test('TC-109: list filters by category and date range', async ({ api }) => {
    await api.createOk(validExpense({ categoryId: CATEGORY.Food, expenseDate: '2026-11-01', description: 'a' }));
    await api.createOk(validExpense({ categoryId: CATEGORY.Travel, expenseDate: '2026-11-15', description: 'b' }));
    await api.createOk(validExpense({ categoryId: CATEGORY.Travel, expenseDate: '2026-12-01', description: 'c' }));

    const byCat = await (await api.list({ category: CATEGORY.Travel })).json();
    expect(byCat).toHaveLength(2);

    const byDate = await (await api.list({ from: '2026-11-10', to: '2026-11-30' })).json();
    expect(byDate.map((e) => e.description)).toEqual(['b']);
  });

  test('TC-110: list sorts by amount', async ({ api }) => {
    await api.createOk(validExpense({ amount: 10 }));
    await api.createOk(validExpense({ amount: 500 }));
    const list = await (await api.list({ sort: 'amount_desc' })).json();
    expect(list.map((e) => e.amount)).toEqual([500, 10]);
  });

  test('TC-111: invalid query params are rejected', async ({ api }) => {
    expect((await api.list({ sort: 'nonsense' })).status()).toBe(400);
  });
});

test.describe('Categories, summary and docs API', () => {
  test('TC-112: duplicate category returns 409', async ({ api }) => {
    expect((await api.createCategory('Food')).status()).toBe(409);
    expect((await api.createCategory('Pets')).status()).toBe(201);
  });

  test('TC-113: monthly summary totals by category', async ({ api }) => {
    await api.createOk(validExpense({ amount: 100, categoryId: CATEGORY.Food, expenseDate: '2026-11-02' }));
    await api.createOk(validExpense({ amount: 50, categoryId: CATEGORY.Food, expenseDate: '2026-11-09' }));
    await api.createOk(validExpense({ amount: 25, categoryId: CATEGORY.Bills, expenseDate: '2026-11-12' }));
    await api.createOk(validExpense({ amount: 999, expenseDate: '2026-10-31' }));
    const s = await (await api.summary('2026-11')).json();
    expect(s.total).toBe(175);
    expect(s.byCategory[0]).toMatchObject({ category: 'Food', total: 150, count: 2 });
  });

  test('TC-114: summary requires a valid month', async ({ api }) => {
    expect((await api.summary('November')).status()).toBe(400);
  });

  test('TC-115: Swagger UI is served', async ({ request }) => {
    const res = await request.get('/api-docs/');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('swagger');
  });
});
