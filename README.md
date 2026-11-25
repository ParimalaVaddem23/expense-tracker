# Expense Tracker

A small full-stack expense tracker: Express REST API, SQLite storage (better-sqlite3), Zod validation,
a vanilla HTML/CSS/JS single-page UI and Swagger docs. Application code is plain JavaScript (no TypeScript).

## Prerequisites
- Node.js 20 or newer
- npm
- A C/C++ toolchain is only needed if no prebuilt `better-sqlite3` binary exists for your platform

## Setup
```bash
npm install
cp .env.example .env     # optional; defaults work out of the box
```

### Environment variables
| Variable   | Default            | Description                                           |
|------------|--------------------|-------------------------------------------------------|
| `PORT`     | `3000`             | HTTP port                                             |
| `NODE_ENV` | `development`      | `production` disables the `/api/test-data/*` routes   |
| `DB_PATH`  | `./db/expenses.db` | SQLite file (relative to project root, or absolute)   |

## Run
```bash
npm start        # production-style run
npm run dev      # auto-restart with nodemon
```
- App: http://localhost:3000
- API docs (Swagger UI): http://localhost:3000/api-docs

The database file and schema are created automatically on first start.

### Database scripts
```bash
npm run db:init   # create the DB from db/schema.sql (safe to re-run)
npm run db:seed   # add the sample rows from db/seed.sql (re-running adds them again)
```

## Build
```bash
npm run build
```
Syntax-checks all JS, copies `src/`, `public/`, `db/` and package files into `dist/`, and writes a deployable
archive (`dist/expense-tracker-<version>.tar.gz`, or `.zip` if `tar` is unavailable). To deploy: extract it,
run `npm ci --omit=dev` (or `npm install --omit=dev`), then `npm start`.

## API summary
All errors use `{ "error": "message", "details": [ { "field": "...", "message": "..." } ] }`
with status `400` (validation), `404` (not found) or `500` (unexpected).

| Method | Path                 | Description                                                              |
|--------|----------------------|--------------------------------------------------------------------------|
| POST   | `/api/expenses`      | Create (201 + created expense)                                           |
| GET    | `/api/expenses`      | List; filters `category`, `from`, `to` (when both `from` and `to` are supplied, `from` must be on/before `to`; invalid ranges return `400 Validation failed` with a detail on field `from`); sorted by date desc, id desc     |
| GET    | `/api/expenses/:id`  | Get one (404 if missing)                                                 |
| PUT    | `/api/expenses/:id`  | Full update (404 if missing)                                             |
| DELETE | `/api/expenses/:id`  | Delete (204; 404 if missing)                                             |
| GET    | `/api/summary`       | `{ total, count, byCategory: [{ category, total, count }] }`, same filters (when both `from` and `to` are supplied, `from` must be on/before `to`; invalid ranges return `400 Validation failed` with a detail on field `from`) |
| GET    | `/api/health`        | `{ "status": "ok" }`                                                     |

Expense fields: `title` (1-100 chars), `amount` (> 0, max 2 decimals, JSON number), `category`
(Food, Transport, Shopping, Bills, Entertainment, Health, Other), `date` (`YYYY-MM-DD`, not in the future),
`note` (optional, max 255). Responses also include `id`, `created_at`, `updated_at`.
`byCategory` lists only categories that have at least one matching expense (highest total first).

## Test-data endpoints
Enabled only when `NODE_ENV !== "production"`; they return 404 otherwise.

- `POST /api/test-data/seed` with `{ "expenses": [ ... ] }` validates every item, inserts all in one
  transaction (nothing is inserted if any item is invalid) and returns `201 { inserted, expenses }`.
- `DELETE /api/test-data/reset` deletes all expenses, resets the id sequence and returns `204`.

## UI notes for test authors
Elements carry the `data-testid` attributes listed in the requirements. Amounts and totals are rendered as plain
numbers with two decimals (e.g. `12.50`, no currency symbol). `form-error-<field>` elements (`title`, `amount`,
`category`, `date`, `note`) are always in the DOM but hidden until they have a message. Per-category summary
items use the category name as-is, e.g. `summary-category-Food`. Delete uses `window.confirm`.

## Project structure
```
expense-tracker/
  src/
    server.js              # starts the HTTP server
    app.js                 # Express app (exported, no listen)
    config.js              # env-based configuration
    openapi.js             # OpenAPI spec for /api-docs
    routes/                # expenses, summary, health, testData, index
    services/              # expenseService.js (all SQL lives here)
    db/connection.js       # better-sqlite3 connection + auto-init
    schemas/               # Zod schemas
    middleware/errorHandler.js
  public/                  # index.html, styles.css, app.js (frontend)
  db/                      # schema.sql, seed.sql (the .db file is git-ignored)
  scripts/                 # build.js, db-init.js, db-seed.js
  docs/                    # design documents
  tests/                   # (empty - written separately)
  package.json  .gitignore  .env.example  README.md
```