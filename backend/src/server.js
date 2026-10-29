// Entry point: npm start
const config = require('./config');
const { openDb } = require('./db');
const queries = require('./queries');
const seedData = require('./data/seed-data');
const { createApp } = require('./app');

const db = openDb(config.dbPath);

// First run on an empty DB: load the assignment's cast so the API works immediately.
if (queries.countCandidates(db) === 0) {
  const loaded = queries.resetAndLoad(db, seedData);
  console.log(`Empty database seeded: ${loaded.candidates} candidates, ${loaded.jobs} jobs`);
}

createApp(db).listen(config.port, () => {
  console.log(`Recruiter Bot listening on http://localhost:${config.port}`);
});
