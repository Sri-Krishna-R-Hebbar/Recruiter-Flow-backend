const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../src/db');
const queries = require('../src/queries');
const seedData = require('../src/data/seed-data');
const { createApp } = require('../src/app');

let server;
let base;

test.before(async () => {
  const db = openDb(':memory:');
  queries.resetAndLoad(db, seedData);
  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

test.after(() => server.close());

const get = (p) => fetch(base + p).then(async (r) => ({ status: r.status, body: await r.json() }));
const post = (p, body) =>
  fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json() }));

test('seed data is loaded: 15 candidates, 6 jobs', async () => {
  assert.equal((await get('/candidates')).body.length, 15);
  assert.equal((await get('/jobs')).body.length, 6);
});

test('Backend Detective: Sherlock ranks first with a near-perfect score (95)', async () => {
  const { status, body } = await get('/jobs/1/matches');
  assert.equal(status, 200);
  assert.equal(body.job.title, 'Backend Detective');
  assert.equal(body.matches[0].candidate.name, 'Sherlock H.');
  assert.equal(body.matches[0].score, 95);
  // Only candidates sharing at least one required skill appear: Sherlock + Sheldon (pattern-recognition).
  assert.deepEqual(body.matches.map((m) => m.candidate.name), ['Sherlock H.', 'Sheldon C.']);
  assert.ok(body.matches.every((m, i) => m.rank === i + 1 && typeof m.reason === 'string'));
});

test('Sales Engineer: Dwight (available) outranks Michael (not looking)', async () => {
  const names = (await get('/jobs/6/matches')).body.matches.map((m) => m.candidate.name);
  assert.ok(names.indexOf('Dwight S.') < names.indexOf('Michael S.'));
});

test('candidate -> jobs direction: Sherlock best fits Backend Detective', async () => {
  const { status, body } = await get('/candidates/1/matches');
  assert.equal(status, 200);
  assert.equal(body.matches[0].job.title, 'Backend Detective');
  assert.equal(body.matches[0].score, 95);
});

test('limit and include_all query params', async () => {
  assert.equal((await get('/jobs/1/matches?limit=1')).body.matches.length, 1);
  assert.equal((await get('/jobs/1/matches?include_all=true')).body.matches.length, 15);
  assert.equal((await get('/jobs/1/matches?limit=0')).status, 400);
});

test('unknown / invalid ids', async () => {
  assert.equal((await get('/jobs/999/matches')).status, 404);
  assert.equal((await get('/candidates/999/matches')).status, 404);
  assert.equal((await get('/jobs/abc/matches')).status, 400);
});

test('POST /candidates ingests a new candidate who then shows up in matches', async () => {
  const created = await post('/candidates', {
    name: 'Jessica J.', skills: ['Forensics', 'deduction'], experience_years: 6,
    availability: 'Immediate', traits: ['analytical'],
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.skills.sort(), ['deduction', 'forensics']);
  const names = (await get('/jobs/1/matches')).body.matches.map((m) => m.candidate.name);
  assert.ok(names.includes('Jessica J.'));
});

test('POST /jobs and payload validation', async () => {
  const ok = await post('/jobs', { title: 'Data Wrangler', required_skills: ['research'], min_experience: 1 });
  assert.equal(ok.status, 201);
  assert.equal((await post('/jobs', { title: '', required_skills: ['x'], min_experience: 1 })).status, 400);
  assert.equal((await post('/candidates', { name: 'X', skills: [], experience_years: 1, availability: 'Immediate' })).status, 400);
  assert.equal((await post('/candidates', { name: 'X', skills: ['a'], experience_years: 1, availability: 'Maybe' })).status, 400);
});
