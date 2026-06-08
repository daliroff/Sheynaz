const express = require('express');
const path    = require('path');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = 'admin123';
const ADMIN_TOKEN    = 'sheynaz-admin-2024';

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin auth middleware
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_TOKEN, success: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

// ── Destination routes ───────────────────────────────────────────────────────

// Public: list all destinations
app.get('/api/destinations', (req, res) => {
  try {
    const destinations = db.getAllDestinations();
    res.json(destinations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Public: get single destination
app.get('/api/destinations/:id', (req, res) => {
  try {
    const dest = db.getDestinationById(Number(req.params.id));
    if (!dest) return res.status(404).json({ error: 'Destination not found' });
    res.json(dest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch destination' });
  }
});

// Admin: create destination
app.post('/api/destinations', requireAdmin, (req, res) => {
  try {
    const { country_name, price_uzs, price_usd, notes } = req.body;
    if (!country_name) {
      return res.status(400).json({ error: 'country_name is required' });
    }
    const dest = db.createDestination({ country_name, price_uzs, price_usd, notes });
    res.status(201).json(dest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create destination' });
  }
});

// Admin: update destination
app.put('/api/destinations/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getDestinationById(id);
    if (!existing) return res.status(404).json({ error: 'Destination not found' });

    const { country_name, price_uzs, price_usd, notes } = req.body;
    if (!country_name) {
      return res.status(400).json({ error: 'country_name is required' });
    }
    const updated = db.updateDestination(id, { country_name, price_uzs, price_usd, notes });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update destination' });
  }
});

// Admin: delete destination
app.delete('/api/destinations/:id', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getDestinationById(id);
    if (!existing) return res.status(404).json({ error: 'Destination not found' });
    db.deleteDestination(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete destination' });
  }
});

// ── Request routes ───────────────────────────────────────────────────────────

// Public: submit a booking request
app.post('/api/requests', (req, res) => {
  try {
    const { customer_name, phone, destination_country, travel_date } = req.body;
    if (!customer_name || !phone || !destination_country || !travel_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const request = db.createRequest({ customer_name, phone, destination_country, travel_date });
    res.status(201).json({ success: true, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Admin: list all requests
app.get('/api/requests', requireAdmin, (req, res) => {
  try {
    const requests = db.getAllRequests();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Admin: update request status
app.put('/api/requests/:id/status', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['pending', 'contacted'].includes(status)) {
      return res.status(400).json({ error: 'Status must be pending or contacted' });
    }
    const updated = db.updateRequestStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

// ── SPA fallback for /admin ──────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Sheynaz Travel server running at http://localhost:${PORT}`);
});
