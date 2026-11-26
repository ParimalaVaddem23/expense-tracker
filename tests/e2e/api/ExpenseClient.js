const { expect } = require('@playwright/test');

class ExpenseClient {
  constructor(request) { this.request = request; }

  reset() { return this.request.delete('/api/test/reset'); }
  list(params = {}) { return this.request.get('/api/expenses', { params }); }
  get(id) { return this.request.get(`/api/expenses/${id}`); }
  create(data) { return this.request.post('/api/expenses', { data }); }
  update(id, data) { return this.request.put(`/api/expenses/${id}`, { data }); }
  remove(id) { return this.request.delete(`/api/expenses/${id}`); }
  categories() { return this.request.get('/api/categories'); }
  createCategory(name) { return this.request.post('/api/categories', { data: { name } }); }
  summary(month) { return this.request.get('/api/summary', { params: { month } }); }

  /** Create an expense and assert success: handy for test data setup. */
  async createOk(data) {
    const res = await this.create(data);
    expect(res.status(), 'setup: create expense').toBe(201);
    return res.json();
  }
}

module.exports = { ExpenseClient };
