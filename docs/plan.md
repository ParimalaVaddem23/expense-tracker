# AI-Assisted SDLC Plan (Human-in-the-Loop)

## Scope
This plan is based strictly on approved Jira work items and verified repository evidence.

### Jira keys covered
- **EX-4** — [EPIC] Enforce consistent filter validation across API and UI
- **EX-5** — [STORY] Reject expense list requests with from > to
- **EX-6** — [TASK] Add route-level validation for date range in expenses
- **EX-7** — [TASK] Add route-level validation for date range in summary

## Evidence verified (repo)
Files reviewed to validate “Source evidence” and existing behavior:
- `public/app.js`
- `src/routes/expenses.js`
- `src/routes/summary.js`
- `src/schemas/expenseSchema.js`
- `src/middleware/errorHandler.js`
- `src/app.js`
- `src/openapi.js` (exists; will be updated if applicable)
- `README.md`
- `package.json`

Key findings:
- Server-side filter range validation **already exists** via `filterSchema` in `src/schemas/expenseSchema.js` (Zod `.refine(...)` enforcing `from <= to`).
- Both `src/routes/expenses.js` and `src/routes/summary.js` parse filters via `cleanQuery(...)` and `filterSchema.parse(...)`.
- Validation errors are returned as `{ "error": "Validation failed", "details": [...] }` by `src/middleware/errorHandler.js`.
- No automated test framework is currently present in `package.json` (no `test` script, no Playwright).

## Plan (Gate 1 approved)

### Story EX-5 — Reject expense list requests with from > to

#### Objectives
- Ensure API behavior is consistent and explicitly documented.
- Add automated coverage using **Playwright** for **both API and UI** as required.
- Use `npm start` to start the server during automation runs.

#### Ordered plan steps
1. **Baseline verification (no functional change expected)**
   - Confirm current behavior for both endpoints:
     - `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD` returns **400** when `from > to`.
     - `GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` returns **400** when `from > to`.
   - Confirm error response follows the documented shape:
     - `{ error: string, details: [{ field: string, message: string }] }`
   - Confirm `details[].field` aligns with schema path (expected `"from"` based on Zod refine path).

2. **Documentation alignment**
   - Update OpenAPI docs (if applicable) to explicitly state the constraint: `from` must be on/before `to`.
   - Update `README.md` (if needed) to include this explicit constraint in the API summary or endpoint notes.

3. **Introduce Playwright framework (project-wide automation)**
   - Add Playwright as a dev dependency (`@playwright/test`).
   - Add Playwright configuration with `webServer` using **`npm start`**.
   - Ensure test runs set:
     - `NODE_ENV=test` (so `/api/test-data/*` routes remain enabled)
     - `PORT=3000` (or an available port if needed)
     - `DB_PATH` set to an isolated test database file (e.g., `./db/expenses.test.db`) to avoid clobbering developer data.
   - Add npm scripts:
     - `test:e2e` (runs Playwright)
     - Optional alias `test` -> `test:e2e` (only if team prefers)

4. **Add automated API tests under Playwright (request-based)**
   - Use Playwright’s `request` fixture to test the REST API.
   - Ensure deterministic state by calling:
     - `POST /api/test-data/reset`
     - `POST /api/test-data/seed`
     - before each test (or in `beforeEach`).
   - Test cases:
     - Expenses invalid range: `from > to` => 400 + `{error,details}` + details mention date ordering.
     - Expenses valid range: `from <= to` => 200.
     - Summary invalid range: `from > to` => 400 + `{error,details}`.
     - Summary valid range: `from <= to` => 200.

5. **Add automated UI tests under Playwright (page-based)**
   - Validate UI behavior remains consistent with the Epic goal (UI blocks invalid ranges).
   - Test cases (minimum stable assertions):
     - Enter filter dates where **From > To** and verify UI shows an error/validation message and does not apply filter.
     - Enter a valid date range and verify UI successfully applies filter (e.g., list updates / no validation error).
   - Prefer stable selectors (ids already used in UI):
     - `#filter-from`, `#filter-to`, and banner/error containers if present.

6. **Developer workflow and documentation**
   - Document how to run tests locally (and any one-time Playwright install needs) in `README.md`.

## Files to change/create
### Expected changes
- `package.json` (add Playwright devDependency and scripts)
- `package-lock.json` (lockfile update)
- `playwright.config.js` (new)
- `tests/e2e/helpers/testData.js` (new)
- `tests/e2e/api/date-range.spec.js` (new)
- `tests/e2e/ui/filter-date-range.spec.js` (new)
- `src/openapi.js` (doc update, if applicable)
- `README.md` (doc update)

## Task mapping
- **EX-6** maps to:
  - Baseline verification step (expenses endpoint)
  - Playwright API test cases for `/api/expenses` invalid/valid range
  - UI test cases validating filter UI behavior (shared across endpoints)
- **EX-7** maps to:
  - Baseline verification step (summary endpoint)
  - Playwright API test cases for `/api/summary` invalid/valid range
- **EX-5** maps to:
  - Documentation alignment
  - Adding Playwright framework and scripts
  - All automated tests (API + UI)

## Risks & mitigations
- **DB state coupling / data clobbering**: mitigate by setting a dedicated `DB_PATH` for tests.
- **Flaky UI tests**: mitigate by using stable selectors and minimal assertions.
- **Environment mismatch**: ensure Playwright `webServer` runs with `NODE_ENV=test` so `/api/test-data/*` routes exist.

