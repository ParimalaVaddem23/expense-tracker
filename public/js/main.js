const $ = (id) => document.querySelector(`[data-testid="${id}"]`);
let editingId = null;

function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 401) {
    window.location.assign('/login.html');
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

function showError(err) {
  const box = $('form-error');
  const text = err.details ? err.details.map((d) => d.message).join('. ') : err.message || 'Something went wrong';
  box.textContent = text;
  box.hidden = false;
}
const clearError = () => { $('form-error').hidden = true; $('form-error').textContent = ''; };

async function loadCategories() {
  const cats = await api('/categories');
  const form = $('category-select');
  const filter = $('filter-category');
  form.innerHTML = '';
  filter.innerHTML = '<option value="">All categories</option>';
  cats.forEach((c) => {
    form.add(new Option(c.name, c.id));
    filter.add(new Option(c.name, c.id));
  });
}

async function loadExpenses() {
  const q = new URLSearchParams();
  if ($('filter-category').value) q.set('category', $('filter-category').value);
  if ($('filter-from').value) q.set('from', $('filter-from').value);
  if ($('filter-to').value) q.set('to', $('filter-to').value);
  q.set('sort', $('filter-sort').value);
  const list = await api(`/expenses?${q}`);
  const body = $('expense-list');
  body.innerHTML = '';
  list.forEach((e) => body.appendChild(renderRow(e)));
  $('empty-state').hidden = list.length > 0;
}

function cell(text, cls, testid) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  if (testid) td.dataset.testid = testid;
  return td;
}

function renderRow(e) {
  const tr = document.createElement('tr');
  tr.dataset.testid = 'expense-row';
  tr.dataset.id = e.id;
  tr.append(
    cell(e.expenseDate, '', 'row-date'),
    cell(e.category, '', 'row-category'),
    cell(e.description, '', 'row-description'),
    cell(e.amount.toFixed(2), 'num', 'row-amount')
  );
  const actions = document.createElement('td');
  actions.className = 'row-actions';
  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  edit.dataset.testid = 'edit-btn';
  edit.onclick = () => startEdit(e);
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.className = 'danger';
  del.dataset.testid = 'delete-btn';
  del.onclick = () => removeExpense(e.id);
  actions.append(edit, ' ', del);
  tr.appendChild(actions);
  return tr;
}

async function loadSummary() {
  const s = await api(`/summary?month=${$('month-input').value}`);
  $('summary-total').textContent = s.total.toFixed(2);
  const chips = $('summary-breakdown');
  chips.innerHTML = '';
  s.byCategory.forEach((c) => {
    const li = document.createElement('li');
    li.dataset.testid = 'summary-category';
    li.textContent = `${c.category}: ${c.total.toFixed(2)}`;
    chips.appendChild(li);
  });
}

const refresh = () => Promise.all([loadExpenses(), loadSummary()]);

function resetForm() {
  editingId = null;
  $('amount-input').value = '';
  $('description-input').value = '';
  $('date-input').value = localDate();
  $('form-title').textContent = 'Add expense';
  $('add-btn').textContent = 'Add expense';
  $('cancel-btn').hidden = true;
  clearError();
}

function startEdit(e) {
  editingId = e.id;
  $('amount-input').value = e.amount;
  $('category-select').value = e.categoryId;
  $('date-input').value = e.expenseDate;
  $('description-input').value = e.description;
  $('form-title').textContent = 'Edit expense';
  $('add-btn').textContent = 'Save changes';
  $('cancel-btn').hidden = false;
  clearError();
  $('amount-input').focus();
}

async function submit() {
  clearError();
  const raw = $('amount-input').value;
  const payload = {
    amount: raw === '' ? null : Number(raw),
    categoryId: Number($('category-select').value),
    description: $('description-input').value.trim(),
    expenseDate: $('date-input').value || null,
  };
  try {
    if (editingId) await api(`/expenses/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/expenses', { method: 'POST', body: JSON.stringify(payload) });
    resetForm();
    await refresh();
  } catch (err) {
    showError(err);
  }
}

async function removeExpense(id) {
  await api(`/expenses/${id}`, { method: 'DELETE' });
  if (editingId === id) resetForm();
  await refresh();
}

async function init() {
  // Auth: verify session and populate user UI
  const me = await api('/auth/me');
  const emailEl = $('user-email');
  if (emailEl) emailEl.textContent = me.email;

  const logoutBtn = $('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await api('/auth/logout', { method: 'POST' });
      } finally {
        window.location.assign('/login.html');
      }
    };
  }

  $('month-input').value = localDate().slice(0, 7);
  await loadCategories();
  resetForm();
  $('add-btn').onclick = submit;
  $('cancel-btn').onclick = resetForm;
  $('apply-filter').onclick = loadExpenses;
  $('clear-filter').onclick = () => {
    $('filter-category').value = '';
    $('filter-from').value = '';
    $('filter-to').value = '';
    $('filter-sort').value = 'date_desc';
    loadExpenses();
  };
  $('month-input').onchange = loadSummary;
  await refresh();
  document.body.dataset.ready = 'true';
}

init().catch((err) => {
  // If api() already redirected on 401, avoid flashing an error.
  if (String(err?.message).toLowerCase().includes('unauthorized')) return;
  showError(err);
});
