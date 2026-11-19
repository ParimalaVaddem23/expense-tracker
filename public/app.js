/* Expense Tracker frontend (vanilla JS) */
'use strict';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
const FIELDS = ['title', 'amount', 'category', 'date', 'note'];

// ---- DOM references -------------------------------------------------------
const $ = (id) => document.getElementById(id);
const form = $('expense-form');
const inputs = {
  title: $('input-title'),
  amount: $('input-amount'),
  category: $('select-category'),
  date: $('input-date'),
  note: $('input-note'),
};
const banner = $('message-banner');
const filterEls = { category: $('filter-category'), from: $('filter-from'), to: $('filter-to') };

// ---- State ----------------------------------------------------------------
let editingId = null; // null = adding, otherwise the id being edited
let filters = {};     // active filters: { category, from, to }
let expensesById = new Map();

// ---- Helpers --------------------------------------------------------------
const money = (n) => Number(n).toFixed(2);

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function showBanner(type, text) {
  banner.textContent = text;
  banner.className = `banner ${type}`;
  banner.hidden = false;
}
function hideBanner() {
  banner.hidden = true;
  banner.textContent = '';
  banner.className = 'banner';
}

function queryString(f) {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** fetch wrapper: parses JSON, throws {message, details} on non-2xx. */
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  let body = null;
  try { body = await res.json(); } catch (_) { /* ignore */ }
  if (!res.ok) {
    const err = new Error((body && body.error) || `Request failed (${res.status})`);
    err.details = (body && body.details) || [];
    throw err;
  }
  return body;
}

// ---- Inline form validation -------------------------------------------------
function clearFieldErrors() {
  FIELDS.forEach((f) => {
    const el = $(`error-${f}`);
    el.textContent = '';
    el.hidden = true;
    inputs[f].classList.remove('invalid');
  });
}

function setFieldError(field, message) {
  const el = $(`error-${field}`);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  inputs[field].classList.add('invalid');
}

/** Mirrors the server rules so users get instant feedback. Returns {errors, data}. */
function validateForm() {
  const errors = {};
  const title = inputs.title.value.trim();
  const amountRaw = inputs.amount.value.trim();
  const category = inputs.category.value;
  const date = inputs.date.value;
  const note = inputs.note.value;

  if (!title) errors.title = 'Title is required';
  else if (title.length > 100) errors.title = 'Title must be at most 100 characters';

  const amount = Number(amountRaw);
  if (!amountRaw) errors.amount = 'Amount is required';
  else if (!Number.isFinite(amount)) errors.amount = 'Amount must be a number';
  else if (amount <= 0) errors.amount = 'Amount must be greater than 0';
  else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) errors.amount = 'Amount must have at most 2 decimal places';

  if (!category) errors.category = 'Category is required';

  if (!date) errors.date = 'Date is required';
  else if (date > todayString()) errors.date = 'Date cannot be in the future';

  if (note.length > 255) errors.note = 'Note must be at most 255 characters';

  return { errors, data: { title, amount, category, date, note: note.trim() === '' ? null : note } };
}

// ---- Rendering --------------------------------------------------------------
function renderSummary(s) {
  $('summary-total').textContent = money(s.total);
  $('summary-count').textContent = String(s.count);

  const list = $('summary-categories');
  list.replaceChildren();
  s.byCategory.forEach((c) => {
    const li = document.createElement('li');
    li.setAttribute('data-testid', `summary-category-${c.category}`);
    li.textContent = `${c.category}: ${money(c.total)} (${c.count})`;
    list.appendChild(li);
  });
}

function cell(text, testid, className) {
  const td = document.createElement('td');
  td.textContent = text;
  td.setAttribute('data-testid', testid);
  if (className) td.className = className;
  return td;
}

function button(label, testid, className, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className = className;
  b.setAttribute('data-testid', testid);
  b.addEventListener('click', onClick);
  return b;
}

function renderExpenses(list) {
  const body = $('expenses-body');
  body.replaceChildren();
  expensesById = new Map(list.map((e) => [e.id, e]));

  list.forEach((e) => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-testid', 'expense-row');
    tr.dataset.id = String(e.id);

    tr.appendChild(cell(e.date, 'row-date'));
    tr.appendChild(cell(e.title, 'row-title'));
    tr.appendChild(cell(e.category, 'row-category'));
    tr.appendChild(cell(money(e.amount), 'row-amount', 'num'));

    const actions = document.createElement('td');
    actions.className = 'row-actions';
    actions.appendChild(button('Edit', 'btn-edit', 'btn btn-small', () => startEdit(e.id)));
    actions.appendChild(button('Delete', 'btn-delete', 'btn btn-small btn-danger', () => removeExpense(e.id)));
    tr.appendChild(actions);

    body.appendChild(tr);
  });

  $('empty-state').hidden = list.length > 0;
}

// ---- Data loading -----------------------------------------------------------
async function refresh() {
  const qs = queryString(filters);
  const [list, summary] = await Promise.all([api(`/api/expenses${qs}`), api(`/api/summary${qs}`)]);
  renderExpenses(list);
  renderSummary(summary);
}

async function safeRefresh() {
  try { await refresh(); } catch (err) { showBanner('error', err.message); }
}

// ---- Form behaviour ---------------------------------------------------------
function resetForm() {
  editingId = null;
  form.reset();
  inputs.date.max = todayString();
  clearFieldErrors();
  $('form-heading').textContent = 'Add expense';
}

function startEdit(id) {
  const e = expensesById.get(id);
  if (!e) return;
  hideBanner();
  clearFieldErrors();
  editingId = id;
  inputs.title.value = e.title;
  inputs.amount.value = e.amount;
  inputs.category.value = e.category;
  inputs.date.value = e.date;
  inputs.note.value = e.note || '';
  $('form-heading').textContent = 'Edit expense';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  inputs.title.focus();
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  hideBanner();
  clearFieldErrors();

  const { errors, data } = validateForm();
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([f, m]) => setFieldError(f, m));
    return;
  }

  const wasEditing = editingId !== null;
  try {
    if (wasEditing) await api(`/api/expenses/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
    else await api('/api/expenses', { method: 'POST', body: JSON.stringify(data) });

    resetForm();
    await refresh();
    showBanner('success', wasEditing ? 'Expense updated successfully' : 'Expense added successfully');
  } catch (err) {
    // Show server-side validation errors next to the matching fields
    let shown = false;
    (err.details || []).forEach((d) => {
      if (FIELDS.includes(d.field)) { setFieldError(d.field, d.message); shown = true; }
    });
    showBanner('error', shown ? 'Please fix the highlighted fields' : err.message);
  }
});

$('btn-cancel').addEventListener('click', () => {
  hideBanner();
  resetForm();
});

async function removeExpense(id) {
  if (!window.confirm('Are you sure you want to delete this expense?')) return;
  hideBanner();
  try {
    await api(`/api/expenses/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    await refresh();
    showBanner('success', 'Expense deleted successfully');
  } catch (err) {
    showBanner('error', err.message);
  }
}

// ---- Filters ----------------------------------------------------------------
$('btn-apply-filter').addEventListener('click', async () => {
  hideBanner();
  const next = {
    category: filterEls.category.value,
    from: filterEls.from.value,
    to: filterEls.to.value,
  };
  if (next.from && next.to && next.from > next.to) {
    showBanner('error', '"From" date must not be after "To" date');
    return;
  }
  filters = next;
  await safeRefresh();
});

$('btn-clear-filter').addEventListener('click', async () => {
  hideBanner();
  filterEls.category.value = '';
  filterEls.from.value = '';
  filterEls.to.value = '';
  filters = {};
  await safeRefresh();
});

// ---- Init -------------------------------------------------------------------
function init() {
  CATEGORIES.forEach((c) => {
    inputs.category.add(new Option(c, c));
    filterEls.category.add(new Option(c, c));
  });
  inputs.date.max = todayString();
  safeRefresh();
}

init();
