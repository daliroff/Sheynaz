// ── Seed data (used when localStorage is empty) ───────────────────────────────

const SEED_DESTINATIONS = [
  {"id":1,"country_name":"Turkiya (Istanbul)","price_usd":299,"price_uzs":3800000,"notes":"Viza kerak emas"},
  {"id":2,"country_name":"BAA (Dubai)","price_usd":399,"price_uzs":5100000,"notes":"Viza kerak emas"},
  {"id":3,"country_name":"Rossiya (Moskva)","price_usd":199,"price_uzs":2500000,"notes":"Viza kerak emas"},
  {"id":4,"country_name":"Janubiy Koreya","price_usd":599,"price_uzs":7600000,"notes":"Viza talab qilinadi"},
  {"id":5,"country_name":"Xitoy","price_usd":449,"price_uzs":5700000,"notes":"Viza talab qilinadi"},
  {"id":6,"country_name":"Germaniya","price_usd":699,"price_uzs":8900000,"notes":"Shengen viza"},
  {"id":7,"country_name":"Buyuk Britaniya","price_usd":749,"price_uzs":9500000,"notes":"UK viza talab qilinadi"}
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
  // Seed on first visit
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
  // Update active lang button
  const lang = getLang();
  document.querySelectorAll('.lang-switcher button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.querySelectorAll('.lang-switcher button').forEach(btn => {
  btn.addEventListener('click', () => {
    setLang(btn.dataset.lang);
  });
});

document.addEventListener('langchange', () => {
  applyTranslations();
  renderDestinations();
});

// Apply on load
applyTranslations();

// ── Main app ──────────────────────────────────────────────────────────────────

let destinations = [];

function init() {
  // Set min date to today
  const dateInput = document.getElementById('travel_date');
  dateInput.min = new Date().toISOString().split('T')[0];

  // Load destinations from localStorage
  destinations = getDestinations();

  renderDestinations();
}

function renderDestinations() {
  const select = document.getElementById('destination_country');
  const grid   = document.getElementById('destGrid');

  // Rebuild the select — keep the placeholder option translated, then re-add destinations
  const currentVal = select.value;
  // Remove all options except placeholder
  while (select.options.length > 1) select.remove(1);
  // Update placeholder text
  select.options[0].textContent = t('placeholder_dest');

  if (destinations.length) {
    grid.innerHTML = '';
    destinations.forEach(d => {
      // Populate select
      const opt = document.createElement('option');
      opt.value = d.country_name;
      opt.textContent = d.country_name;
      select.appendChild(opt);

      // Populate card
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
    // Restore selection
    select.value = currentVal;
  } else {
    grid.innerHTML = `<p style="color:#718096">${t('no_destinations')}</p>`;
  }
}

init();
