const TOKEN_KEY = 'sheynaz_admin_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(tk) { localStorage.setItem(TOKEN_KEY, tk); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

// ── Language switcher ────────────────────────────────────────────────────────

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Update active lang button
  const lang = getLang();
  document.querySelectorAll('.lang-switcher button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.querySelectorAll('.lang-switcher button').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

document.addEventListener('langchange', () => {
  applyTranslations();
  // Re-render dynamic content if visible
  const reqVisible  = document.getElementById('section-requests')?.style.display !== 'none';
  const destVisible = document.getElementById('section-destinations')?.style.display !== 'none';
  if (getToken()) {
    if (reqVisible)  loadRequests();
    if (destVisible) loadDestinations();
  }
});

applyTranslations();

// ── Login ────────────────────────────────────────────────────────────────────

async function tryLogin() {
  const pass = document.getElementById('adminPass').value;
  const err  = document.getElementById('loginError');
  err.style.display = 'none';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
      showApp();
    } else {
      err.style.display = 'block';
    }
  } catch (e) {
    err.textContent = t('network_error');
    err.style.display = 'block';
  }
}

document.getElementById('loginBtn').addEventListener('click', tryLogin);
document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  location.reload();
});

// ── Section nav ──────────────────────────────────────────────────────────────

document.querySelectorAll('.sidebar nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.sidebar nav a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const sec = link.dataset.section;
    document.querySelectorAll('.main-content > div[id^="section-"]').forEach(s => s.style.display = 'none');
    document.getElementById('section-' + sec).style.display = 'block';
    if (sec === 'requests')     loadRequests();
    if (sec === 'destinations') loadDestinations();
  });
});

// ── App init ─────────────────────────────────────────────────────────────────

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  loadRequests();
}

if (getToken()) showApp();

// ── Requests ─────────────────────────────────────────────────────────────────

async function loadRequests() {
  const tbody = document.getElementById('requestsTbody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#718096">${t('loading')}</td></tr>`;
  try {
    const res  = await fetch('/api/requests', { headers: authHeaders() });
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#718096">${t('no_requests')}</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(r.customer_name)}</td>
        <td>${esc(r.phone)}</td>
        <td>${esc(r.destination_country)}</td>
        <td>${r.travel_date}</td>
        <td><span class="badge badge-${r.status}">${t('status_' + r.status) || r.status}</span></td>
        <td>${fmtDate(r.created_at)}</td>
        <td>
          ${r.status === 'pending'
            ? `<button class="btn btn-success btn-sm" onclick="markContacted(${r.id})">${t('btn_mark_contacted')}</button>`
            : `<button class="btn btn-sm" style="background:#e2e8f0" onclick="markPending(${r.id})">${t('btn_reset')}</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#e53e3e">${t('failed_load')}</td></tr>`;
  }
}

async function markContacted(id) {
  await fetch('/api/requests/' + id + '/status', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'contacted' }),
  });
  loadRequests();
}

async function markPending(id) {
  await fetch('/api/requests/' + id + '/status', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status: 'pending' }),
  });
  loadRequests();
}

// ── Destinations ─────────────────────────────────────────────────────────────

async function loadDestinations() {
  const tbody = document.getElementById('destTbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#718096">${t('loading')}</td></tr>`;
  try {
    const res  = await fetch('/api/destinations');
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#718096">${t('no_destinations')}</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(d.country_name)}</strong></td>
        <td>${d.price_usd ? '$' + d.price_usd : '—'}</td>
        <td>${d.price_uzs ? d.price_uzs.toLocaleString() + ' UZS' : '—'}</td>
        <td style="color:#718096;font-size:0.85rem">${esc(d.notes || '')}</td>
        <td class="actions">
          <button class="btn btn-sm btn-primary" onclick="editDest(${d.id})">${t('btn_edit')}</button>
          <button class="btn btn-sm btn-danger"  onclick="deleteDest(${d.id}, '${esc(d.country_name)}')">${t('btn_delete')}</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#e53e3e">${t('failed_load')}</td></tr>`;
  }
}

const destForm       = document.getElementById('destForm');
const destSubmitBtn  = document.getElementById('destSubmitBtn');
const destCancelBtn  = document.getElementById('destCancelBtn');
const destFormTitle  = document.getElementById('destFormTitle');

destForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id  = document.getElementById('editId').value;
  const body = {
    country_name: document.getElementById('f_country').value.trim(),
    price_usd:    Number(document.getElementById('f_usd').value) || null,
    price_uzs:    Number(document.getElementById('f_uzs').value) || null,
    notes:        document.getElementById('f_notes').value.trim(),
  };
  const url    = id ? '/api/destinations/' + id : '/api/destinations';
  const method = id ? 'PUT' : 'POST';
  await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
  resetDestForm();
  loadDestinations();
});

destCancelBtn.addEventListener('click', resetDestForm);

function resetDestForm() {
  destForm.reset();
  document.getElementById('editId').value = '';
  destFormTitle.textContent  = t('add_dest_title');
  destSubmitBtn.textContent  = t('btn_add_dest');
  destCancelBtn.style.display = 'none';
  // Keep data-i18n in sync so langchange updates it
  destFormTitle.dataset.i18n  = 'add_dest_title';
  destSubmitBtn.dataset.i18n  = 'btn_add_dest';
}

async function editDest(id) {
  const res = await fetch('/api/destinations/' + id);
  const d   = await res.json();
  document.getElementById('editId').value    = d.id;
  document.getElementById('f_country').value = d.country_name;
  document.getElementById('f_usd').value     = d.price_usd || '';
  document.getElementById('f_uzs').value     = d.price_uzs || '';
  document.getElementById('f_notes').value   = d.notes || '';
  destFormTitle.textContent  = t('edit_dest_title');
  destSubmitBtn.textContent  = t('btn_save');
  destCancelBtn.style.display = 'inline-block';
  destFormTitle.dataset.i18n  = 'edit_dest_title';
  destSubmitBtn.dataset.i18n  = 'btn_save';
  document.getElementById('destForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteDest(id, name) {
  if (!confirm(t('delete_confirm') + ' "' + name + '"')) return;
  await fetch('/api/destinations/' + id, { method: 'DELETE', headers: authHeaders() });
  loadDestinations();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
