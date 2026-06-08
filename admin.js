// ── Constants ─────────────────────────────────────────────────────────────────

const DEST_KEY   = 'sheynaz_destinations';
const ADMIN_KEY  = 'sheynaz_admin_auth';
const ADMIN_PASS = 'admin123';

const SEED_DESTINATIONS = [
  {id:1, country_name:'Turkiya (Istanbul)', price_usd:299, price_uzs:3800000, notes:'Viza kerak emas'},
  {id:2, country_name:'BAA (Dubai)',        price_usd:399, price_uzs:5100000, notes:'Viza kerak emas'},
  {id:3, country_name:'Rossiya (Moskva)',   price_usd:199, price_uzs:2500000, notes:'Viza kerak emas'},
  {id:4, country_name:'Janubiy Koreya',     price_usd:599, price_uzs:7600000, notes:'Viza talab qilinadi'},
  {id:5, country_name:'Xitoy',             price_usd:449, price_uzs:5700000, notes:'Viza talab qilinadi'},
  {id:6, country_name:'Germaniya',         price_usd:699, price_uzs:8900000, notes:'Shengen viza'},
  {id:7, country_name:'Buyuk Britaniya',   price_usd:749, price_uzs:9500000, notes:'UK viza talab qilinadi'}
];

// ── JSONBin helpers ───────────────────────────────────────────────────────────

async function jbRead() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`, {
    headers: {
      'X-Master-Key': CONFIG.JSONBIN_KEY,
      'X-Bin-Meta': 'false'
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`JSONBin ${res.status}: ${body}`);
  }
  const data = await res.json();
  const record = data.record !== undefined ? data.record : data;
  return record.requests || [];
}

async function jbWrite(requests) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': CONFIG.JSONBIN_KEY
    },
    body: JSON.stringify({ requests })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`JSONBin save ${res.status}: ${body}`);
  }
}

// ── localStorage helpers (destinations only) ──────────────────────────────────

function isLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === '1';
}

function getDestinations() {
  try {
    const raw = localStorage.getItem(DEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  localStorage.setItem(DEST_KEY, JSON.stringify(SEED_DESTINATIONS));
  return SEED_DESTINATIONS;
}

function saveDestinations(list) {
  localStorage.setItem(DEST_KEY, JSON.stringify(list));
}

function nextId(list) {
  return list.length ? Math.max(...list.map(d => d.id)) + 1 : 1;
}

// ── Language switcher ─────────────────────────────────────────────────────────

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
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
  if (isLoggedIn()) {
    const reqVisible  = document.getElementById('section-requests').style.display  !== 'none';
    const destVisible = document.getElementById('section-destinations').style.display !== 'none';
    if (reqVisible)  loadRequests();
    if (destVisible) loadDestinations();
  }
});

applyTranslations();

// ── Login ─────────────────────────────────────────────────────────────────────

function tryLogin() {
  const pass = document.getElementById('adminPass').value;
  const err  = document.getElementById('loginError');
  err.style.display = 'none';
  if (pass === ADMIN_PASS) {
    localStorage.setItem(ADMIN_KEY, '1');
    showApp();
  } else {
    err.style.display = 'block';
  }
}

document.getElementById('loginBtn').addEventListener('click', tryLogin);
document.getElementById('adminPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryLogin();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
});

// ── Section nav ───────────────────────────────────────────────────────────────

document.querySelectorAll('.sidebar nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.sidebar nav a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const sec = link.dataset.section;
    document.querySelectorAll('.main-content > div[id^="section-"]').forEach(s => s.style.display = 'none');
    document.getElementById('section-' + sec).style.display = 'block';
    if (sec === 'requests')    loadRequests();
    if (sec === 'destinations') loadDestinations();
  });
});

// ── App init ──────────────────────────────────────────────────────────────────

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';
  loadRequests(); // load requests by default
}

if (isLoggedIn()) showApp();

// ── Requests ──────────────────────────────────────────────────────────────────

let allRequests = [];

async function loadRequests() {
  const tbody = document.getElementById('requestsTbody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#718096">${t('loading')}</td></tr>`;
  try {
    allRequests = await jbRead();
    renderRequests();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#e53e3e">${t('failed_load')}<br><small>${err.message}</small></td></tr>`;
  }
}

function renderRequests() {
  const tbody = document.getElementById('requestsTbody');
  if (!allRequests.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#718096">${t('no_requests')}</td></tr>`;
    return;
  }
  tbody.innerHTML = allRequests.map((r, i) => {
    const isPending   = r.status === 'pending';
    const isContacted = r.status === 'contacted';
    const badge = isPending
      ? `<span class="badge badge-pending">${t('status_pending')}</span>`
      : `<span class="badge badge-contacted">${t('status_contacted')}</span>`;
    const actionBtn = isPending
      ? `<button class="btn btn-sm btn-success" onclick="setStatus(${r.id}, 'contacted')">${t('btn_mark_contacted')}</button>`
      : `<button class="btn btn-sm" style="background:#e2e8f0" onclick="setStatus(${r.id}, 'pending')">${t('btn_reset')}</button>`;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.phone)}</td>
        <td>${esc(r.dest)}</td>
        <td>${esc(r.date)}</td>
        <td style="font-size:0.8rem;color:#718096">${esc(r.created_at || '')}</td>
        <td>${badge}</td>
        <td>${actionBtn}</td>
      </tr>`;
  }).join('');
}

async function setStatus(id, status) {
  const req = allRequests.find(r => r.id === id);
  if (!req) return;
  req.status = status;
  try {
    await jbWrite(allRequests);
    renderRequests();
  } catch (err) {
    alert(t('network_error') + '\n' + err.message);
  }
}

// ── Destinations ──────────────────────────────────────────────────────────────

function loadDestinations() {
  const tbody = document.getElementById('destTbody');
  const data  = getDestinations();
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
}

const destForm      = document.getElementById('destForm');
const destSubmitBtn = document.getElementById('destSubmitBtn');
const destCancelBtn = document.getElementById('destCancelBtn');
const destFormTitle = document.getElementById('destFormTitle');

destForm.addEventListener('submit', e => {
  e.preventDefault();
  const id   = document.getElementById('editId').value;
  const body = {
    country_name: document.getElementById('f_country').value.trim(),
    price_usd:    Number(document.getElementById('f_usd').value) || null,
    price_uzs:    Number(document.getElementById('f_uzs').value) || null,
    notes:        document.getElementById('f_notes').value.trim(),
  };
  let list = getDestinations();
  if (id) {
    const idx = list.findIndex(d => String(d.id) === String(id));
    if (idx !== -1) list[idx] = { ...list[idx], ...body };
  } else {
    list.push({ id: nextId(list), ...body });
  }
  saveDestinations(list);
  resetDestForm();
  loadDestinations();
});

destCancelBtn.addEventListener('click', resetDestForm);

function resetDestForm() {
  destForm.reset();
  document.getElementById('editId').value = '';
  destFormTitle.textContent   = t('add_dest_title');
  destSubmitBtn.textContent   = t('btn_add_dest');
  destCancelBtn.style.display = 'none';
  destFormTitle.dataset.i18n  = 'add_dest_title';
  destSubmitBtn.dataset.i18n  = 'btn_add_dest';
}

function editDest(id) {
  const list = getDestinations();
  const d    = list.find(x => x.id === id);
  if (!d) return;
  document.getElementById('editId').value    = d.id;
  document.getElementById('f_country').value = d.country_name;
  document.getElementById('f_usd').value     = d.price_usd || '';
  document.getElementById('f_uzs').value     = d.price_uzs || '';
  document.getElementById('f_notes').value   = d.notes || '';
  destFormTitle.textContent   = t('edit_dest_title');
  destSubmitBtn.textContent   = t('btn_save');
  destCancelBtn.style.display = 'inline-block';
  destFormTitle.dataset.i18n  = 'edit_dest_title';
  destSubmitBtn.dataset.i18n  = 'btn_save';
  document.getElementById('destForm').scrollIntoView({ behavior: 'smooth' });
}

function deleteDest(id, name) {
  if (!confirm(t('delete_confirm') + ' "' + name + '"')) return;
  let list = getDestinations();
  list = list.filter(d => d.id !== id);
  saveDestinations(list);
  loadDestinations();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
