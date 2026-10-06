const Database = require('better-sqlite3');

const db = new Database('api/measurements.db');

db.exec(`
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    glucose REAL NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    meal TEXT NOT NULL CHECK(meal IN ('before', 'after')),
    feeling TEXT NOT NULL CHECK(feeling IN ('good', 'normal', 'bad')),
    note TEXT,
    created_at TEXT NOT NULL
    );
`);

module.exports = db;