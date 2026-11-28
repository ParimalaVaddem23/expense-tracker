# EX-31 [EPIC] Add delete confirmation for expenses in UI - Implementation plan
- Status: Draft
- Epic: EX-31 (https://parimalavaddem23.atlassian.net/browse/EX-31). Story: EX-32 (https://parimalavaddem23.atlassian.net/browse/EX-32). Subtasks: EX-33 (https://parimalavaddem23.atlassian.net/browse/EX-33), EX-34 (https://parimalavaddem23.atlassian.net/browse/EX-34).
- Base branch: develop
- Implementation branch (Phase 4): feat/ex-31-add-delete-confirmation

## 1. Scope
Add a user confirmation step before deleting an expense from the UI expense list.
Update Playwright UI tests to cover both confirm and cancel flows for the delete confirmation.

## 2. Assumptions and open questions
1) Confirmation UX uses the browser-native dialog (`window.confirm(...)`) (default).
2) Confirming proceeds with the existing delete behavior: call `DELETE /api/expenses/:id`, refresh the list, and reset the form if the deleted item was being edited (default: keep current behavior in `removeExpense`).
3) Cancelling does not call the DELETE endpoint and leaves the UI unchanged (default).
4) Confirmation message text: "Delete this expense?" (default). (Tests should not assert exact text unless required.)

## 3. Steps per Subtask

### EX-33 [TASK] Add delete confirmation prompt in frontend
| Step | File (existing or new) | Change | Acceptance scenario covered |
|---|---|---|---|
| 1 | `public/js/main.js` (function `renderRow`, delete button handler) | Wrap `removeExpense(e.id)` call with a confirm gate: if user cancels, return early; if confirmed, call `removeExpense(e.id)` as today. | “Cancelling delete keeps the expense” |
| 2 | `public/js/main.js` (optional: function `removeExpense`) | Keep deletion logic unchanged; ensure no unintended refresh happens on cancel (refresh remains only inside `removeExpense`). | “Confirming delete removes the expense”; “Cancelling delete keeps the expense” |

### EX-34 [TASK] Update Playwright UI tests for delete confirm/cancel
| Step | File (existing or new) | Change | Acceptance scenario covered |
|---|---|---|---|
| 1 | `tests/e2e/pages/ExpensePage.js` (method `deleteExpense`) | Add optional parameter to choose dialog outcome (accept/dismiss) and implement Playwright dialog handling around the click (e.g., `page.once('dialog', d => d.accept())` / `d.dismiss()`). | Both scenarios (drives confirm/cancel) |
| 2 | `tests/e2e/ui/expenses.ui.spec.js` (test `TC-004: delete an expense`) | Update existing test to accept the dialog and assert the row is removed and other rows remain. | “Confirming delete removes the expense” |
| 3 | `tests/e2e/ui/expenses.ui.spec.js` (new test case) | Add a new test (e.g., `TC-008: cancel delete keeps the expense`) that dismisses the dialog and asserts the row is still present. | “Cancelling delete keeps the expense” |

Notes:
- These are browser-only behaviors (native confirm dialog) and will be fully covered via Playwright UI automation; no “hand to QA” scenarios are required beyond normal regression runs.

## 4. Files
Files to modify:
- `public/js/main.js`
- `tests/e2e/pages/ExpensePage.js`
- `tests/e2e/ui/expenses.ui.spec.js`

Files to create:
- None

## 5. Branch and commits
- Branch: `feat/ex-31-add-delete-confirmation`
- Commits (one per Subtask, plus test commit):
  - `feat(EX-31): confirm before deleting expense in UI` (implements EX-33)
  - `test(EX-31): cover delete confirm/cancel in UI e2e` (implements EX-34)
- One pull request into `develop`.
- Do not commit `dist/` (not used in this repo).

## 6. Risks
1) Risk: Playwright dialog timing flakiness (listener added too late).  
   - Where: `tests/e2e/pages/ExpensePage.js` (`deleteExpense`)  
   - Mitigation: Register `page.once('dialog', ...)` before clicking the delete button; keep handler minimal.
2) Risk: Confirmation blocks automated runs if a dialog is unhandled.  
   - Where: `tests/e2e/ui/expenses.ui.spec.js` and page object  
   - Mitigation: Centralize dialog handling in the page object so every delete action in tests handles the dialog explicitly.
3) Risk: UX copy change breaks tests if they assert dialog text.  
   - Where: `tests/e2e/*`  
   - Mitigation: Avoid strict assertions on dialog message text unless required by acceptance criteria.
