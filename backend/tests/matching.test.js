const test = require('node:test');
const assert = require('node:assert/strict');
const { experienceFit, scorePair, rankPairs } = require('../src/matching');

const base = {
  candidate_name: 'A', job_title: 'J',
  experience_years: 5, min_experience: 3, availability: 'Immediate',
  required_skill_count: 3, matched_skills: ['a', 'b', 'c'],
  keyword_count: 2, matched_traits: ['x', 'y'],
};

test('experienceFit: meeting or exceeding the minimum is full marks, below is proportional', () => {
  assert.equal(experienceFit(5, 3), 1);
  assert.equal(experienceFit(3, 3), 1);
  assert.equal(experienceFit(2, 4), 0.5);
  assert.equal(experienceFit(0, 0), 1);
});

test('scorePair: perfect pair scores 100', () => {
  assert.equal(scorePair(base).score, 100);
});

test('scorePair: partial skills, short on experience, slow availability', () => {
  const r = scorePair({
    ...base, matched_skills: ['a'], experience_years: 2, min_experience: 4,
    matched_traits: [], availability: '2 weeks',
  });
  // skills 1/3*55=18.3, exp 0.5*25=12.5, culture 0, availability 0.6*10=6 -> 36.8
  assert.equal(r.score, 36.8);
  assert.match(r.reason, /Skills 1\/3 \(a\)/);
  assert.match(r.reason, /2 short of the 4-yr minimum/);
});

test('rankPairs: drops zero-skill-overlap pairs unless includeAll', () => {
  const none = { ...base, candidate_name: 'None', matched_skills: [] };
  assert.equal(rankPairs([base, none]).length, 1);
  assert.equal(rankPairs([base, none], { includeAll: true }).length, 2);
});

test('rankPairs: ties break on matched skills, then experience, then name', () => {
  const a = { ...base, candidate_name: 'Zed', experience_years: 9 };
  const b = { ...base, candidate_name: 'Amy', experience_years: 9 };
  const c = { ...base, candidate_name: 'Old', experience_years: 20 };
  const order = rankPairs([a, b, c]).map((m) => m.stats.candidate_name);
  assert.deepEqual(order, ['Old', 'Amy', 'Zed']);
});
