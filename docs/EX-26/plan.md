# EX-26 Implementation Plan — JWT authentication

Scope source: Jira Epic **EX-26** and its Story/Tasks (**EX-27**, **EX-28**, **EX-29**, **EX-30**). This plan is derived strictly from the Jira ticket content plus verified repo evidence.

## Assumptions / Decisions (approved)
1. **Decision:** Use `jsonwebtoken + cookie-parser + bcryptjs` (not custom crypto/JWT).
2. **Decision:** Pin **exact versions** for all three dependencies in `package.json`.
3. **Decision:** Use **bcryptjs cost factor 10**.
4. **Decision:** JWT algorithm is **HS256 only**.
5. **Decision:** Auth middleware sets `req.user = { id, email }` after verification.
6. **Decision (cookie defaults):** cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=3600`; set `Secure` only when `req.secure === true`.
7. **Decision:** `JWT_SECRET` is read from environment variable, must be **>= 32 characters**; server refuses to start otherwise. Playwright supplies a fixed secret via `webServer.env`.
8. **Decision (Playwright):** Add a Playwright **setup project** that registers a test user once and saves `storageState`; UI and API tests reuse it. Any test reset route/fixture must **not** delete that user.
9. **Decision (migration):** Existing DBs need a migration step for a new `user_id` column.

## Evidence verified (repo)
Evidence references were found and the following files were read:
- `src/app.js`
- `src/routes.js`
- `src/db.js`
- `src/schemas.js`
- `src/openapi.js`
- `src/server.js`
- `public/index.html`
- `public/js/main.js`
- `package.json`
- `playwright.config.js`
- `tests/e2e/api/ExpenseClient.js`
- `tests/e2e/api/expenses.api.spec.js`
- `tests/e2e/ui/expenses.ui.spec.js`
- `tests/e2e/fixtures/index.js`

## Plan Preview (Gate 1 approved)

### EX-27 — [STORY] Require JWT to access UI pages and API routes

#### Ordered plan steps
1. **Add dependencies (pinned versions)**
   - Add `jsonwebtoken`, `cookie-parser`, `bcryptjs` to `package.json` with exact versions (no caret ranges).

2. **Add DB migration for auth + per-user scoping**
   - Extend SQLite schema in `src/db.js` to create a `users` table: `id`, `email` (unique), `password_hash`, `created_at`.
   - Add a migration step to introduce `user_id` to existing domain tables that require ownership (as described by the tickets). Include a backfill plan so existing rows remain accessible (e.g., create a default user and assign existing rows), without breaking local/dev databases.
   - Ensure migrations are idempotent and safe to run on startup.

3. **Add repository/service operations**
   - Add repo methods in `src/repo.js` to:
     - create a user
     - find user by email
     - find user by id (for `/me`)
   - Update existing repo methods for protected resources to support user scoping via `user_id` (as required by the Epic/Story).

4. **Add Zod schemas for auth**
   - In `src/schemas.js`, add validation for register/login payloads.

5. **Implement auth endpoints under `/api/auth`**
   - In `src/routes.js` (or extracted route module), implement:
     - `POST /api/auth/register`
     - `POST /api/auth/login` (bcryptjs compare; issue 1-hour JWT; set cookie)
     - `GET /api/auth/me`
     - `POST /api/auth/logout` (clears cookie)
   - Ensure authentication failures return 401 JSON without leaking whether email exists.

6. **Validate JWT_SECRET at startup**
   - In `src/server.js` (or equivalent server bootstrap), validate `process.env.JWT_SECRET` exists and length >= 32; if not, refuse to start.

7. **Add JWT auth middleware + protect routes**
   - Add middleware (new file recommended) that:
     - reads JWT from HttpOnly cookie
     - verifies signature + expiry with HS256 only
     - sets `req.user = { id, email }`
     - returns `401 {"error":"Unauthorized"}` for unauthenticated/invalid token
   - Apply middleware to protect:
     - `/api/expenses`
     - `/api/categories`
     - `/api/summary`
   - Keep `GET /api/health` and `/api-docs` public.

8. **Update OpenAPI docs**
   - Update `src/openapi.js` to document cookie-based auth for protected routes.
   - Ensure the Swagger UI remains reachable without auth.

9. **Update UI for auth + redirect behavior**
   - Create `public/login.html` (public page) and client-side logic to register/login.
   - Update `public/js/main.js`:
     - on load call `/api/auth/me`; redirect to `/login.html` on 401
     - update shared `api()` helper to redirect to `/login.html` on any 401
     - add logout action calling `/api/auth/logout`

10. **Update Playwright to authenticate (must be part of this work)**
   - Update `playwright.config.js` to add a `setup` project.
   - Add a setup spec that registers/logs in a test user once and saves `storageState` (cookie-based session).
   - Ensure API and UI tests reuse the `storageState`.
   - Ensure any test reset route/fixture does not delete the test user.
   - Update existing tests that will otherwise return 401.

#### File change list (by area)
- **Dependencies**: `package.json`, `package-lock.json`
- **Backend**: `src/server.js`, `src/app.js`, `src/routes.js`, `src/db.js`, `src/repo.js`, `src/schemas.js`, `src/openapi.js`
- **New backend modules (recommended)**: `src/middleware/auth.js` and/or `src/routes/auth.js`
- **UI**: `public/login.html` (new), `public/js/main.js`, (optional) `public/js/login.js` (new), `public/index.html` (if adding logout UI element)
- **Tests**: `playwright.config.js`, `tests/e2e/fixtures/index.js`, `tests/e2e/api/ExpenseClient.js`, `tests/e2e/api/expenses.api.spec.js`, `tests/e2e/ui/expenses.ui.spec.js`, `tests/e2e/pages/ExpensePage.js`, plus new setup spec file(s)

#### Tests to add/update
- **API Playwright**
  - Add coverage for `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
  - Verify protected endpoints return `401 {"error":"Unauthorized"}` without cookie.
  - Verify `/api/health` and `/api-docs` remain public.
- **UI Playwright**
  - Verify unauthenticated navigation redirects to `/login.html`.
  - Verify login returns user to app.
  - Verify any later 401 (expired/invalid token simulation) triggers redirect to `/login.html`.
  - Verify logout clears session.
  - Assert JWT is not stored in localStorage.

#### Risks
- All existing Playwright tests will 401 until authenticated setup/storageState is implemented; test updates must ship with the change.
- DB migration risk: existing DB files must be migrated safely (new `users` table + `user_id` columns/backfill).
- Cookie `Secure` behavior differs between local HTTP and HTTPS; must not break local dev/tests.
- Ensure APIs return JSON 401 while UI performs client-side redirect.

#### Task mapping
- **EX-28** maps to steps 1, 2, 4, 5.
- **EX-29** maps to steps 6, 7, 8.
- **EX-30** maps to steps 9, 10.
