const { expect } = require('@playwright/test');

async function resetDb(request) {
  const res = await request.delete('/api/test-data/reset');
  expect(res.ok()).toBeTruthy();
}

async function seedDb(request) {
  const res = await request.post('/api/test-data/seed');
  expect(res.ok()).toBeTruthy();
}

async function resetAndSeed(request) {
  await resetDb(request);
  await seedDb(request);
}

module.exports = {
  resetDb,
  seedDb,
  resetAndSeed,
};
