// Entry point: npm run seed  (wipes and reloads the seed data)
const config = require('./config');
const { openDb } = require('./db');
const queries = require('./queries');
const seedData = require('./data/seed-data');

const db = openDb(config.dbPath);
const loaded = queries.resetAndLoad(db, seedData);
console.log(`Seeded ${loaded.candidates} candidates and ${loaded.jobs} jobs into ${config.dbPath}`);
