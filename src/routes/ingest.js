// Ingestion + listing: POST/GET /candidates, POST/GET /jobs, POST /seed
const express = require('express');
const queries = require('../queries');
const seedData = require('../data/seed-data');
const { validateCandidate, validateJob } = require('../validation');

module.exports = function ingestRouter(db) {
  const router = express.Router();

  router.post('/seed', (_req, res) => {
    res.status(201).json({ message: 'database reset and seeded', ...queries.resetAndLoad(db, seedData) });
  });

  router.get('/candidates', (_req, res) => res.json(queries.listCandidates(db)));
  router.get('/jobs', (_req, res) => res.json(queries.listJobs(db)));

  router.post('/candidates', (req, res) => {
    const id = queries.createCandidate(db, validateCandidate(req.body));
    res.status(201).json(queries.listCandidates(db, id)[0]);
  });

  router.post('/jobs', (req, res) => {
    const id = queries.createJob(db, validateJob(req.body));
    res.status(201).json(queries.listJobs(db, id)[0]);
  });

  return router;
};
