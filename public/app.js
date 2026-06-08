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

// ── Main app ─────────────────────────────────────────────────────────────────

let destinations = [];

async function init() {
  // Set min date to today
  const dateInput = document.getElementById('travel_date');
  dateInput.min = new Date().toISOString().split('T')[0];

  // Load destinations
  try {
    const res = await fetch('/api/destinations');
    destinations = await res.json();
  } catch (e) {
    console.error('Failed to load destinations', e);
  }

  renderDestinations();

  // Handle form submit
  const form       = document.getElementById('requestForm');
  const successBox = document.getElementById('successBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = t('btn_sending');

    const body = {
      customer_name:       form.customer_name.value.trim(),
      phone:               form.phone.value.trim(),
      destination_country: form.destination_country.value,
      travel_date:         form.travel_date.value,
    };

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        form.style.display = 'none';
        successBox.style.display = 'block';
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Something went wrong'));
        btn.disabled = false;
        btn.textContent = t('btn_submit');
      }
    } catch (err) {
      alert(t('network_error'));
      btn.disabled = false;
      btn.textContent = t('btn_submit');
    }
  });
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
      // Populate select (only add if not already there)
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
