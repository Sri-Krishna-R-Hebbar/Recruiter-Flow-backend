// Every SQL statement in the app lives here (hand-written, parameterised). No ORM, no query builder.
const { inTransaction } = require('./db');

// ---------- writes (ingestion) ----------

function insertCandidate(db, c) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO candidates (name, experience_years, availability, quirk) VALUES (?, ?, ?, ?)')
    .run(c.name, c.experience_years, c.availability, c.quirk ?? null);
  const id = Number(lastInsertRowid);

  const upsertSkill = db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)');
  const linkSkill = db.prepare(
    'INSERT INTO candidate_skills (candidate_id, skill_id) SELECT ?, id FROM skills WHERE name = ?',
  );
  for (const skill of c.skills) {
    upsertSkill.run(skill);
    linkSkill.run(id, skill);
  }

  const addTrait = db.prepare('INSERT INTO candidate_traits (candidate_id, trait) VALUES (?, ?)');
  for (const trait of c.traits) addTrait.run(id, trait);
  return id;
}

function insertJob(db, j) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO jobs (title, min_experience, tagline) VALUES (?, ?, ?)')
    .run(j.title, j.min_experience, j.tagline ?? null);
  const id = Number(lastInsertRowid);

  const upsertSkill = db.prepare('INSERT OR IGNORE INTO skills (name) VALUES (?)');
  const linkSkill = db.prepare('INSERT INTO job_skills (job_id, skill_id) SELECT ?, id FROM skills WHERE name = ?');
  for (const skill of j.required_skills) {
    upsertSkill.run(skill);
    linkSkill.run(id, skill);
  }

  const addKeyword = db.prepare('INSERT INTO job_culture_keywords (job_id, keyword) VALUES (?, ?)');
  for (const keyword of j.culture_keywords) addKeyword.run(id, keyword);
  return id;
}

function createCandidate(db, c) {
  return inTransaction(db, () => insertCandidate(db, c));
}

function createJob(db, j) {
  return inTransaction(db, () => insertJob(db, j));
}

// Wipes all data and loads the given candidates and jobs (idempotent seeding).
function resetAndLoad(db, { candidates, jobs }) {
  return inTransaction(db, () => {
    for (const table of [
      'candidate_skills', 'job_skills', 'candidate_traits', 'job_culture_keywords',
      'candidates', 'jobs', 'skills',
    ]) {
      db.exec(`DELETE FROM ${table}`);
    }
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('candidates', 'jobs', 'skills')");
    candidates.forEach((c) => insertCandidate(db, c));
    jobs.forEach((j) => insertJob(db, j));
    return { candidates: candidates.length, jobs: jobs.length };
  });
}

function countCandidates(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM candidates').get().n;
}

// ---------- reads ----------

const CANDIDATE_LIST_SQL = `
  SELECT c.id, c.name, c.experience_years, c.availability, c.quirk,
         (SELECT group_concat(s.name, ',')
            FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id
           WHERE cs.candidate_id = c.id) AS skills,
         (SELECT group_concat(ct.trait, ',')
            FROM candidate_traits ct WHERE ct.candidate_id = c.id) AS traits
    FROM candidates c
   WHERE c.id = COALESCE(?, c.id)
   ORDER BY c.id`;

const JOB_LIST_SQL = `
  SELECT j.id, j.title, j.min_experience, j.tagline,
         (SELECT group_concat(s.name, ',')
            FROM job_skills js JOIN skills s ON s.id = js.skill_id
           WHERE js.job_id = j.id) AS required_skills,
         (SELECT group_concat(k.keyword, ',')
            FROM job_culture_keywords k WHERE k.job_id = j.id) AS culture_keywords
    FROM jobs j
   WHERE j.id = COALESCE(?, j.id)
   ORDER BY j.id`;

const splitList = (s) => (s ? s.split(',') : []);

function listCandidates(db, id = null) {
  return db.prepare(CANDIDATE_LIST_SQL).all(id).map((r) => ({
    ...r, skills: splitList(r.skills), traits: splitList(r.traits),
  }));
}

function listJobs(db, id = null) {
  return db.prepare(JOB_LIST_SQL).all(id).map((r) => ({
    ...r, required_skills: splitList(r.required_skills), culture_keywords: splitList(r.culture_keywords),
  }));
}

// The heart of matching on the SQL side: for every (candidate, job) pair that passes the optional
// filters, return the raw facts (which required skills and which culture keywords the candidate
// has). Scoring those facts is done in matching.js. Pass null to leave a side unfiltered.
const PAIR_STATS_SQL = `
  SELECT c.id AS candidate_id, c.name AS candidate_name, c.experience_years, c.availability, c.quirk,
         j.id AS job_id, j.title AS job_title, j.min_experience, j.tagline,
         (SELECT COUNT(*) FROM job_skills WHERE job_id = j.id) AS required_skill_count,
         (SELECT group_concat(s.name, ',')
            FROM job_skills js
            JOIN candidate_skills cs ON cs.skill_id = js.skill_id AND cs.candidate_id = c.id
            JOIN skills s ON s.id = js.skill_id
           WHERE js.job_id = j.id) AS matched_skills,
         (SELECT COUNT(*) FROM job_culture_keywords WHERE job_id = j.id) AS keyword_count,
         (SELECT group_concat(k.keyword, ',')
            FROM job_culture_keywords k
            JOIN candidate_traits t ON t.trait = k.keyword AND t.candidate_id = c.id
           WHERE k.job_id = j.id) AS matched_traits
    FROM candidates c
   CROSS JOIN jobs j
   WHERE c.id = COALESCE(?, c.id)
     AND j.id = COALESCE(?, j.id)`;

function pairStats(db, { candidateId = null, jobId = null }) {
  return db.prepare(PAIR_STATS_SQL).all(candidateId, jobId).map((r) => ({
    ...r, matched_skills: splitList(r.matched_skills), matched_traits: splitList(r.matched_traits),
  }));
}

module.exports = {
  createCandidate, createJob, resetAndLoad, countCandidates,
  listCandidates, listJobs, pairStats,
};
