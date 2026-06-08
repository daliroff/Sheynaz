(async () => {
  // Set min date to today
  const dateInput = document.getElementById('travel_date');
  dateInput.min = new Date().toISOString().split('T')[0];

  // Load destinations into select + grid
  let destinations = [];
  try {
    const res = await fetch('/api/destinations');
    destinations = await res.json();
  } catch (e) {
    console.error('Failed to load destinations', e);
  }

  const select = document.getElementById('destination_country');
  const grid   = document.getElementById('destGrid');

  if (destinations.length) {
    grid.innerHTML = '';
    destinations.forEach(d => {
      // Populate select
      const opt = document.createElement('option');
      opt.value = d.country_name;
      opt.textContent = d.country_name;
      select.appendChild(opt);

      // Populate card
      const card = document.createElement('div');
      card.className = 'dest-card';
      card.innerHTML = `
        <div class="dest-name">${d.country_name}</div>
        ${d.price_usd ? `<div class="dest-price">from $${d.price_usd}</div>` : ''}
        ${d.notes ? `<div class="dest-notes">${d.notes}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        select.value = d.country_name;
        document.getElementById('requestForm').scrollIntoView({ behavior: 'smooth' });
      });
      grid.appendChild(card);
    });
  } else {
    grid.innerHTML = '<p style="color:#718096">No destinations available yet.</p>';
  }

  // Handle form submit
  const form       = document.getElementById('requestForm');
  const successBox = document.getElementById('successBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending...';

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
        btn.textContent = 'Request Price';
      }
    } catch (err) {
      alert('Network error. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Request Price';
    }
  });
})();
