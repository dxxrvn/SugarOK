const Database = require('better-sqlite3');

const db = new Database('api/database.db');

db.exec(`
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    glucose REAL NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    meal TEXT NOT NULL CHECK(meal IN ('before', 'after')),
    feeling TEXT NOT NULL CHECK(feeling IN ('good', 'normal', 'bad')),
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT NOT NULL,
    diabetes_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
db.exec(`
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    doses TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
db.exec(`
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    doctor TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    place TEXT,
    note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
module.exports = db;
