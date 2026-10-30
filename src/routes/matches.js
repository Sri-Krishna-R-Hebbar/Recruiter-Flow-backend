// GET /jobs/:id/matches and GET /candidates/:id/matches
const express = require('express');
const queries = require('../queries');
const { rankPairs } = require('../matching');

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ?limit=N (default: all) and ?include_all=true (also list zero-skill-overlap pairs)
function parseOptions(query) {
  const limit = query.limit === undefined ? null : Number(query.limit);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return { error: 'limit must be a positive integer' };
  return { limit, includeAll: query.include_all === 'true' };
}

module.exports = function matchesRouter(db) {
  const router = express.Router();

  router.get('/jobs/:id/matches', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'id must be a positive integer' });
    const opts = parseOptions(req.query);
    if (opts.error) return res.status(400).json({ error: opts.error });

    const [job] = queries.listJobs(db, id);
    if (!job) return res.status(404).json({ error: `job ${id} not found` });

    const ranked = rankPairs(queries.pairStats(db, { jobId: id }), { includeAll: opts.includeAll });
    const matches = ranked.slice(0, opts.limit ?? ranked.length).map((m, i) => ({
      rank: i + 1,
      candidate: {
        id: m.stats.candidate_id,
        name: m.stats.candidate_name,
        experience_years: m.stats.experience_years,
        availability: m.stats.availability,
      },
      score: m.score,
      breakdown: m.breakdown,
      reason: m.reason,
    }));
    res.json({ job: { id: job.id, title: job.title }, count: matches.length, matches });
  });

  router.get('/candidates/:id/matches', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'id must be a positive integer' });
    const opts = parseOptions(req.query);
    if (opts.error) return res.status(400).json({ error: opts.error });

    const [candidate] = queries.listCandidates(db, id);
    if (!candidate) return res.status(404).json({ error: `candidate ${id} not found` });

    const ranked = rankPairs(queries.pairStats(db, { candidateId: id }), { includeAll: opts.includeAll });
    const matches = ranked.slice(0, opts.limit ?? ranked.length).map((m, i) => ({
      rank: i + 1,
      job: {
        id: m.stats.job_id,
        title: m.stats.job_title,
        min_experience: m.stats.min_experience,
      },
      score: m.score,
      breakdown: m.breakdown,
      reason: m.reason,
    }));
    res.json({ candidate: { id: candidate.id, name: candidate.name }, count: matches.length, matches });
  });

  return router;
};
