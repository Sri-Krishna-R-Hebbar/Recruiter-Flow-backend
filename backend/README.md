# Recruiter Bot (backend)

Ranks candidates for a job, and jobs for a candidate. Node.js + Express + SQLite, raw hand-written SQL only (no ORM).
Needs Node 22.5+ (uses the built-in `node:sqlite`).

## 1. How to run it, and what is not finished

```bash
npm install
cp .env.example .env   # optional, defaults work (PORT=3000, DB_PATH=./data/recruiter-bot.db)
npm start              # http://localhost:3000, seeds itself on first run
npm test               # 13 tests
```

```bash
curl http://localhost:3000/jobs/1/matches
curl http://localhost:3000/candidates/1/matches
curl "http://localhost:3000/jobs/1/matches?limit=3&include_all=true"
```

PowerShell: use `curl.exe` or `Invoke-RestMethod`. Other endpoints: `GET /candidates`, `GET /jobs`,
`POST /candidates`, `POST /jobs`, `POST /seed` (reset data).

Part 2 answers are in `sql_detective.sql` (dataset in `sql/hiring_ops_setup.sql`).

Not finished / known limits: no pagination or auth, no API docs, and skills and culture keywords are matched by
exact name only (no synonyms).

## 2. Three decisions and why

1. **SQL gathers facts, JavaScript scores them.** `src/queries.js` returns, per candidate/job pair, which required
   skills and culture keywords match. `src/matching.js` turns that into a 0-100 score (skills 55, experience 25,
   culture 10, availability 10). Scoring stays pure and unit-testable, and weights can change without touching SQL.
2. **Normalised schema, derived matches.** Skills live in their own table with link tables, so "skill overlap" is a
   join. A match is computed on request, not stored, so nothing goes stale when candidates or jobs change. With this
   data size that is cheap.
3. **Explicit ranking rules.** Zero skill overlap is not a match (otherwise Michael Scott "matches" Backend Detective
   on availability alone). Experience above the minimum earns no extra credit, and "Not looking" is penalised rather
   than excluded. Ties break on matched skills, then experience, then name, so the order is deterministic.

## 3. What I would improve with another day

Precompute and cache matches for larger data, add pagination, add a synonym map for skills and culture keywords,
make the weights configurable per job, and add API docs.

## 4. How I used AI tools

I used Claude Code to scaffold the project and draft the code, tests and README. I reviewed the schema, scoring
weights and tie-break rules myself and checked the results against the seed data.
