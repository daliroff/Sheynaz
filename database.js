const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'travel.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_name TEXT NOT NULL,
    price_uzs INTEGER,
    price_usd INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    travel_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed destinations if empty
const count = db.prepare('SELECT COUNT(*) as c FROM destinations').get();
if (count.c === 0) {
  const insert = db.prepare(`
    INSERT INTO destinations (country_name, price_uzs, price_usd, notes)
    VALUES (?, ?, ?, ?)
  `);

  const seedData = [
    ['Turkey (Istanbul)',  2500000,  199, 'Direct flights available. Visa on arrival for Uzbek citizens.'],
    ['Russia (Moscow)',    3200000,  255, 'Visa required. Multiple entry options available.'],
    ['UAE (Dubai)',        4500000,  358, 'Tourist visa required. 30 or 60 day options.'],
    ['South Korea',       6800000,  540, 'K-ETA required. Beautiful culture and food.'],
    ['China',             4200000,  334, 'Visa required. Great Wall, Beijing, Shanghai tours.'],
    ['Germany',           8500000,  676, 'Schengen visa required. Berlin, Munich, Frankfurt.'],
    ['United Kingdom',    9200000,  732, 'UK visa required. London, Edinburgh, Manchester.'],
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(seedData);
}

// ── Destination queries ──────────────────────────────────────────────────────

function getAllDestinations() {
  return db.prepare('SELECT * FROM destinations ORDER BY country_name ASC').all();
}

function getDestinationById(id) {
  return db.prepare('SELECT * FROM destinations WHERE id = ?').get(id);
}

function createDestination({ country_name, price_uzs, price_usd, notes }) {
  const stmt = db.prepare(`
    INSERT INTO destinations (country_name, price_uzs, price_usd, notes)
    VALUES (@country_name, @price_uzs, @price_usd, @notes)
  `);
  const result = stmt.run({ country_name, price_uzs, price_usd, notes });
  return getDestinationById(result.lastInsertRowid);
}

function updateDestination(id, { country_name, price_uzs, price_usd, notes }) {
  const stmt = db.prepare(`
    UPDATE destinations
    SET country_name = @country_name,
        price_uzs    = @price_uzs,
        price_usd    = @price_usd,
        notes        = @notes
    WHERE id = @id
  `);
  stmt.run({ id, country_name, price_uzs, price_usd, notes });
  return getDestinationById(id);
}

function deleteDestination(id) {
  return db.prepare('DELETE FROM destinations WHERE id = ?').run(id);
}

// ── Request queries ──────────────────────────────────────────────────────────

function getAllRequests() {
  return db.prepare('SELECT * FROM requests ORDER BY created_at DESC').all();
}

function createRequest({ customer_name, phone, destination_country, travel_date }) {
  const stmt = db.prepare(`
    INSERT INTO requests (customer_name, phone, destination_country, travel_date)
    VALUES (@customer_name, @phone, @destination_country, @travel_date)
  `);
  const result = stmt.run({ customer_name, phone, destination_country, travel_date });
  return db.prepare('SELECT * FROM requests WHERE id = ?').get(result.lastInsertRowid);
}

function updateRequestStatus(id, status) {
  db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
}

module.exports = {
  getAllDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getAllRequests,
  createRequest,
  updateRequestStatus,
};
