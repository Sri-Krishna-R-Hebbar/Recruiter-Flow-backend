// Pure scoring logic: no DB, no HTTP. Takes the pair facts from queries.pairStats and returns
// a score (0-100) with a human-readable reason. All tuning knobs are in WEIGHTS / AVAILABILITY_SCORE.

const WEIGHTS = {
  skills: 55,       // can they actually do the job?
  experience: 25,   // do they meet the minimum?
  culture: 10,      // trait vs culture keyword overlap
  availability: 10, // can they start soon?
};

const AVAILABILITY_SCORE = {
  Immediate: 1,
  '2 weeks': 0.6,
  'Not looking': 0.1,
};

const round1 = (n) => Math.round(n * 10) / 10;

// Meets the minimum -> full marks. Below it -> proportional (2 of 4 years = 0.5).
// Being far above the minimum is deliberately NOT rewarded (that is seniority, not fit).
function experienceFit(years, minYears) {
  if (minYears === 0 || years >= minYears) return 1;
  return years / minYears;
}

function scorePair(s) {
  const skillRatio = s.required_skill_count === 0 ? 0 : s.matched_skills.length / s.required_skill_count;
  const expRatio = experienceFit(s.experience_years, s.min_experience);
  const cultureRatio = s.keyword_count === 0 ? 0 : s.matched_traits.length / s.keyword_count;
  const availRatio = AVAILABILITY_SCORE[s.availability] ?? 0;

  const breakdown = {
    skills: round1(skillRatio * WEIGHTS.skills),
    experience: round1(expRatio * WEIGHTS.experience),
    culture: round1(cultureRatio * WEIGHTS.culture),
    availability: round1(availRatio * WEIGHTS.availability),
  };
  const score = round1(breakdown.skills + breakdown.experience + breakdown.culture + breakdown.availability);

  const diff = s.experience_years - s.min_experience;
  const expText = diff >= 0
    ? `${s.experience_years} yrs meets the ${s.min_experience}-yr minimum`
    : `${s.experience_years} yrs is ${-diff} short of the ${s.min_experience}-yr minimum`;
  const parts = [
    `Skills ${s.matched_skills.length}/${s.required_skill_count}` +
      (s.matched_skills.length ? ` (${s.matched_skills.join(', ')})` : ''),
    expText,
    s.matched_traits.length ? `culture fit: ${s.matched_traits.join(', ')}` : 'no culture keyword overlap',
    `availability: ${s.availability}`,
  ];

  return { score, breakdown, reason: `${parts.join('; ')}.` };
}

// Candidates with zero skill overlap are not a match at all, so they are dropped. Ranking: score desc,
// then more matched skills, then higher experience, then name (so order is always deterministic).
function rankPairs(stats, { includeAll = false } = {}) {
  return stats
    .filter((s) => includeAll || s.matched_skills.length > 0)
    .map((s) => ({ stats: s, ...scorePair(s) }))
    .sort((a, b) =>
      b.score - a.score ||
      b.stats.matched_skills.length - a.stats.matched_skills.length ||
      b.stats.experience_years - a.stats.experience_years ||
      a.stats.candidate_name.localeCompare(b.stats.candidate_name) ||
      a.stats.job_title.localeCompare(b.stats.job_title));
}

module.exports = { WEIGHTS, AVAILABILITY_SCORE, experienceFit, scorePair, rankPairs };
