-- Part 2: SQL Detective (SQLite syntax; load sql/hiring_ops_setup.sql first).

-- Question 1: all currently open job postings with the owning recruiter's name.
SELECT jp.id,
       jp.title,
       jp.department,
       jp.opened_date,
       r.name AS recruiter
FROM job_postings jp
JOIN recruiters r ON r.id = jp.recruiter_id
WHERE jp.status = 'open'
ORDER BY jp.id;

-- Question 2: for each job posting, how many applicants reached the Final stage.
-- "Reached" = has a Final interview row, whatever its outcome. LEFT JOIN keeps postings with zero.
-- Applicants are de-duplicated by lower-cased email so a duplicate profile is not counted twice.
SELECT jp.id AS job_posting_id,
       jp.title,
       COUNT(DISTINCT LOWER(TRIM(a.email))) AS applicants_at_final
FROM job_postings jp
LEFT JOIN interviews i ON i.job_posting_id = jp.id AND i.stage = 'Final'
LEFT JOIN applicants a ON a.id = i.applicant_id
GROUP BY jp.id, jp.title
ORDER BY jp.id;

-- Question 3: people who effectively applied to more than one job posting.
-- Dirty data: Ananya Rao exists twice (ids 1 and 2), differing only in email casing, so grouping by
-- applicants.id would miss her. A person = lower-cased, trimmed email. An application = a job posting
-- the person has at least one interview for (the schema has no applications table).
SELECT LOWER(TRIM(a.email))                  AS person_email,
       MIN(a.full_name)                      AS full_name,
       COUNT(DISTINCT i.job_posting_id)      AS job_postings_applied,
       GROUP_CONCAT(DISTINCT i.job_posting_id) AS job_posting_ids
FROM applicants a
JOIN interviews i ON i.applicant_id = a.id
GROUP BY LOWER(TRIM(a.email))
HAVING COUNT(DISTINCT i.job_posting_id) > 1
ORDER BY person_email;

-- Question 4: Final-stage conversion rate per recruiter (passed / total Final interviews),
-- only recruiters with at least 3 Final-stage interviews. Pending (NULL) outcomes count in the total.
SELECT r.id,
       r.name,
       COUNT(*)                                              AS final_interviews,
       SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END) AS passed,
       ROUND(1.0 * SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END) / COUNT(*), 2) AS conversion_rate
FROM recruiters r
JOIN job_postings jp ON jp.recruiter_id = r.id
JOIN interviews i    ON i.job_posting_id = jp.id AND i.stage = 'Final'
GROUP BY r.id, r.name
HAVING COUNT(*) >= 3
ORDER BY conversion_rate DESC, r.id;

-- Question 5 (bonus): recruiter with the most successful placements (Final passed) per department.
-- RANK() keeps ties. Departments with no placements (Infrastructure) have no row.
WITH placements AS (
  SELECT jp.department,
         r.name   AS recruiter,
         COUNT(*) AS placements
  FROM interviews i
  JOIN job_postings jp ON jp.id = i.job_posting_id
  JOIN recruiters r    ON r.id = jp.recruiter_id
  WHERE i.stage = 'Final' AND i.outcome = 'passed'
  GROUP BY jp.department, r.id, r.name
),
ranked AS (
  SELECT p.*,
         RANK() OVER (PARTITION BY department ORDER BY placements DESC) AS rnk
  FROM placements p
)
SELECT department, recruiter, placements
FROM ranked
WHERE rnk = 1
ORDER BY department;
