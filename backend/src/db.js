// Opens the SQLite database and applies schema.sql. Uses Node's built-in node:sqlite (raw SQL only).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

// Runs fn inside a transaction; rolls back if it throws.
function inTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { openDb, inTransaction };
