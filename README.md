# Expense Tracker

Express REST API + SQLite (better-sqlite3) + Zod validation + plain HTML/CSS/JS frontend + Swagger docs.
Unit tests use Mocha + Chai; automation uses plain Playwright; manual test cases are written in Gherkin.

## Requirements
- Node.js 20 LTS or later

## Run the app
```bash
npm install
npm start
```
- App: http://localhost:3000
- API docs (Swagger UI): http://localhost:3000/api-docs
- Data is stored in `data/expenses.db` (created automatically). Override with `PORT` and `DB_PATH`.

## Tests
```bash
npm run test:unit                 # Mocha + Chai (in-memory SQLite, no server needed)

npx playwright install chromium   # one-time browser download
npm run test:e2e                  # Playwright API + UI (starts its own server on port 3100, test DB)
npm run test:api                  # API project only
npm run test:ui                   # UI project only
npx playwright test --grep @smoke # tagged subset
npm run test:report               # open the HTML report
```

Playwright starts the app itself with `NODE_ENV=test` and `DB_PATH=./data/test.db`, which mounts
`DELETE /api/test/reset`. An auto fixture calls it before every test so each test starts clean.
Reports: `playwright-report/` (HTML) and `reports/junit.xml`.

## Project layout
```
src/            server.js, app.js, routes.js, repo.js, schemas.js (Zod), db.js, openapi.js
public/         index.html, css/styles.css, js/main.js
tests/unit/     Mocha + Chai
tests/manual/   Gherkin .feature files (expenses, filter-and-summary) (manual test cases, not executed)
tests/e2e/      Playwright: api/ (client + specs), pages/ (POM), fixtures/, helpers/, ui/
playwright.config.js
```

## API summary
| Method | Path | Notes |
|---|---|---|
| GET | /api/expenses | filters: `category`, `from`, `to`, `sort` |
| GET/PUT/DELETE | /api/expenses/:id | 404 if missing, DELETE returns 204 |
| POST | /api/expenses | 201, or 400 with Zod details |
| GET/POST | /api/categories | POST returns 409 for duplicates |
| GET | /api/summary?month=YYYY-MM | total and per-category breakdown |
| GET | /api/health | health check |

Validation errors: `{ "error": "ValidationError", "details": [{ "field": "amount", "message": "..." }] }`

## Traceability
Gherkin scenario IDs (`@TC-001`) match the Playwright test titles (`TC-001: ...`).
Add the Jira story key as a tag (for example `@EXP-12`) when you link them.
