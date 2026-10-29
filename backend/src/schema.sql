-- Recruiter Bot schema (SQLite). Hand-written DDL; skills are normalised so overlap is a SQL join.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS candidates (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  experience_years INTEGER NOT NULL CHECK (experience_years >= 0),
  availability     TEXT    NOT NULL CHECK (availability IN ('Immediate', '2 weeks', 'Not looking')),
  quirk            TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL,
  min_experience INTEGER NOT NULL CHECK (min_experience >= 0),
  tagline        TEXT
);

-- One row per distinct skill name (lower-case), shared by candidates and jobs.
CREATE TABLE IF NOT EXISTS skills (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS candidate_skills (
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id     INTEGER NOT NULL REFERENCES skills(id),
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS job_skills (
  job_id   INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  PRIMARY KEY (job_id, skill_id)
);

-- Candidate traits and job culture keywords share one vocabulary, so they are compared by equality.
CREATE TABLE IF NOT EXISTS candidate_traits (
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  trait        TEXT    NOT NULL,
  PRIMARY KEY (candidate_id, trait)
);

CREATE TABLE IF NOT EXISTS job_culture_keywords (
  job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  keyword TEXT    NOT NULL,
  PRIMARY KEY (job_id, keyword)
);

-- A "match" is derived, not stored: a (candidate, job) pair whose facts are gathered by the
-- pair query in src/queries.js and scored in src/matching.js.

CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill       ON job_skills(skill_id);
