// ── JSONBin helpers ───────────────────────────────────────────────────────────

async function loadRequests() {
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
  // v3 wraps in {record:...}, but public bins may return directly
  const record = data.record !== undefined ? data.record : data;
  return record.requests || [];
}

async function saveRequests(requests) {
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

async function addRequest(entry) {
  const requests = await loadRequests();
  requests.unshift(entry);
  await saveRequests(requests);
}

// ── Telegram notification ─────────────────────────────────────────────────────

async function sendToTelegram(data) {
  const msg =
    `🛫 *Yangi ariza — Sheynaz Travel*\n` +
    `👤 Ism: ${data.name}\n` +
    `📞 Telefon: ${data.phone}\n` +
    `🌍 Yo'nalish: ${data.dest}\n` +
    `📅 Sana: ${data.date}`;

  await fetch(`https://api.telegram.org/bot${CONFIG.TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CONFIG.TG_CHAT_ID, text: msg, parse_mode: 'Markdown' })
  });
  // Telegram error is non-fatal — request still gets saved to JSONBin
}

// ── Seed destinations ─────────────────────────────────────────────────────────

const SEED_DESTINATIONS = [
  {id:1, country_name:'Turkiya (Istanbul)', price_usd:299, price_uzs:3800000, notes:'Viza kerak emas'},
  {id:2, country_name:'BAA (Dubai)',        price_usd:399, price_uzs:5100000, notes:'Viza kerak emas'},
  {id:3, country_name:'Rossiya (Moskva)',   price_usd:199, price_uzs:2500000, notes:'Viza kerak emas'},
  {id:4, country_name:'Janubiy Koreya',     price_usd:599, price_uzs:7600000, notes:'Viza talab qilinadi'},
  {id:5, country_name:'Xitoy',             price_usd:449, price_uzs:5700000, notes:'Viza talab qilinadi'},
  {id:6, country_name:'Germaniya',         price_usd:699, price_uzs:8900000, notes:'Shengen viza'},
  {id:7, country_name:'Buyuk Britaniya',   price_usd:749, price_uzs:9500000, notes:'UK viza talab qilinadi'}
];

const DEST_KEY = 'sheynaz_destinations';

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
  renderDestinations();
});

applyTranslations();

// ── Main app ──────────────────────────────────────────────────────────────────

let destinations = [];

function init() {
  const dateInput = document.getElementById('travel_date');
  dateInput.min = new Date().toISOString().split('T')[0];

  destinations = getDestinations();
  renderDestinations();

  const form       = document.getElementById('requestForm');
  const successBox = document.getElementById('successBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = t('btn_sending');

    const entry = {
      id:         Date.now(),
      name:       form.customer_name.value.trim(),
      phone:      form.phone.value.trim(),
      dest:       form.destination_country.value,
      date:       form.travel_date.value,
      status:     'pending',
      created_at: new Date().toLocaleString('uz-UZ')
    };

    try {
      await addRequest(entry);
      sendToTelegram(entry); // fire-and-forget
      form.style.display = 'none';
      successBox.style.display = 'block';
    } catch (err) {
      alert(t('network_error') + '\n' + err.message);
      btn.disabled = false;
      btn.textContent = t('btn_submit');
    }
  });
}

function renderDestinations() {
  const select = document.getElementById('destination_country');
  const grid   = document.getElementById('destGrid');

  const currentVal = select.value;
  while (select.options.length > 1) select.remove(1);
  select.options[0].textContent = t('placeholder_dest');

  if (destinations.length) {
    grid.innerHTML = '';
    destinations.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.country_name;
      opt.textContent = d.country_name;
      select.appendChild(opt);

      const priceLabel = d.price_usd
        ? `<div class="dest-price">$${d.price_usd} <span style="font-size:0.8rem;font-weight:400">${t('from_price')}</span></div>`
        : '';
      const card = document.createElement('div');
      card.className = 'dest-card';
      card.innerHTML = `
        <div class="dest-name">${d.country_name}</div>
        ${priceLabel}
        ${d.notes ? `<div class="dest-notes">${d.notes}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        select.value = d.country_name;
        document.getElementById('requestForm').scrollIntoView({ behavior: 'smooth' });
      });
      grid.appendChild(card);
    });
    select.value = currentVal;
  } else {
    grid.innerHTML = `<p style="color:#718096">${t('no_destinations')}</p>`;
  }
}

init();
