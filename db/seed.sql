-- Sample data for local development (npm run db:seed)
INSERT INTO expenses (title, amount, category, date, note) VALUES
  ('Grocery shopping',   54.30, 'Food',          '2025-01-05', 'Weekly groceries'),
  ('Bus pass',           30.00, 'Transport',     '2025-01-06', NULL),
  ('Running shoes',      89.99, 'Shopping',      '2025-01-08', 'Sale price'),
  ('Electricity bill',   72.45, 'Bills',         '2025-01-10', 'January'),
  ('Cinema tickets',     24.00, 'Entertainment', '2025-01-12', NULL),
  ('Pharmacy',           15.75, 'Health',        '2025-01-14', 'Vitamins'),
  ('Lunch with friends', 38.20, 'Food',          '2025-01-15', NULL),
  ('Gift',               45.00, 'Other',         '2025-01-18', 'Birthday present');
