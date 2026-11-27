# Expense Tracker

Express REST API + SQLite (better-sqlite3) + Zod validation + plain HTML/CSS/JS frontend + Swagger docs.
Unit tests use Mocha + Chai; automation uses plain Playwright; manual test cases are written in Gherkin.

## Requirements
- Node.js 22.9 or later
- `JWT_SECRET` (32+ characters). The server refuses to start if this is missing or too short.

## Run the app
```bash
npm install
```

Set `JWT_SECRET` (32+ chars) before starting:

```bash
# macOS/Linux
export JWT_SECRET="replace-with-a-strong-32+-char-secret"
npm start

# Windows PowerShell
$env:JWT_SECRET="replace-with-a-strong-32+-char-secret"
npm start
```

`.env` support is available via Node's `--env-file-if-exists` flag (Node >=22.9):

```bash
# .env (example)
JWT_SECRET=replace-with-a-strong-32+-char-secret
PORT=3000
DB_PATH=./data/expenses.db
```

```bash
node --env-file-if-exists=.env src/server.js
```

- App: http://localhost:3000
- Login: http://localhost:3000/login.html
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
| POST | /api/auth/login | sets an auth cookie on success |
| POST | /api/auth/logout | clears the auth cookie |
| GET | /api/auth/me | returns the current user (if logged in) |
| GET | /api/expenses | filters: `category`, `from`, `to`, `sort` (protected: requires auth cookie) |
| GET/PUT/DELETE | /api/expenses/:id | 404 if missing, DELETE returns 204 (protected: requires auth cookie) |
| POST | /api/expenses | 201, or 400 with Zod details (protected: requires auth cookie) |
| GET/POST | /api/categories | POST returns 409 for duplicates (protected: requires auth cookie) |
| GET | /api/summary?month=YYYY-MM | total and per-category breakdown (protected: requires auth cookie) |
| GET | /api/health | health check |

Validation errors: `{ "error": "ValidationError", "details": [{ "field": "amount", "message": "..." }] }`

## Traceability
Gherkin scenario IDs (`@TC-001`) match the Playwright test titles (`TC-001: ...`).
Add the Jira story key as a tag (for example `@EXP-12`) when you link them.
