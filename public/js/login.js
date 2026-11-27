const $ = (id) => document.querySelector(`[data-testid="${id}"]`);

let mode = 'login'; // 'login' | 'register'

function setMode(nextMode) {
  mode = nextMode;
  $('auth-title').textContent = mode === 'login' ? 'Log in' : 'Create account';
  $('login-btn').hidden = mode !== 'login';
  $('register-btn').hidden = mode !== 'register';
  $('toggle-mode-btn').textContent = mode === 'login' ? 'Create an account' : 'Back to login';
  clearMsg();
}

function showError(msg) {
  const el = $('auth-error');
  el.textContent = msg;
  el.hidden = !msg;
}

function showSuccess(msg) {
  const el = $('auth-success');
  el.textContent = msg;
  el.hidden = !msg;
}

function clearMsg() {
  showError('');
  showSuccess('');
}

async function callAuth(path, body) {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || { message: 'Request failed' };
  return data;
}

async function submit(e) {
  e.preventDefault();
  clearMsg();

  const email = $('email-input').value.trim();
  const password = $('password-input').value;

  try {
    if (mode === 'register') {
      await callAuth('/register', { email, password });
      showSuccess('Account created, please log in');
      setMode('login');
      return;
    }

    await callAuth('/login', { email, password });
    window.location.href = '/';
  } catch (err) {
    const msg = (err && err.message) || (err && err.error === 'ValidationError' && 'Invalid input') || 'Something went wrong';
    showError(msg);
  }
}

function init() {
  setMode('login');
  document.getElementById('auth-form').addEventListener('submit', submit);
  $('toggle-mode-btn').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
}

init();
