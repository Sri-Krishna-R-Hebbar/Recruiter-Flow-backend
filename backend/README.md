# Backend: SQL Detective (Part 2)

Only the SQL part is done so far. The Recruiter Bot service (Part 1) comes later.

- `sql/hiring_ops_setup.sql`: the dataset from the brief, loaded as-is.
- `sql_detective.sql`: one query per question (1-5), each preceded by a `-- Question N` comment.

## Run

With the `sqlite3` CLI:

```bash
sqlite3 :memory: ".read sql/hiring_ops_setup.sql" ".headers on" ".mode column" ".read sql_detective.sql"
```

Or with Python (no install needed):

```bash
python -c "import sqlite3;c=sqlite3.connect(':memory:');c.executescript(open('sql/hiring_ops_setup.sql').read());[print(r) for q in open('sql_detective.sql').read().split('-- Question')[1:] for r in c.execute(q.split(chr(10),1)[1]).fetchall()]"
```

## Notes

- The data is dirty: Ananya Rao appears twice with different email casing, so a person is identified by `LOWER(TRIM(email))` (Q2, Q3).
- Q3 uses interviews as the proxy for "applied to a job", since there is no applications table.
- Pending interviews (`NULL` outcome) count in the Q4 total but not as passed.
- AI use: written with Claude Code; I reviewed and checked the results by hand.
