import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bucketDistance, jaccardDistance, noveltyAgainstMeta, rankByPowerNovelty } from '../src/novelty.js';

const meta = JSON.parse(readFileSync(new URL('../data/meta-builds.json', import.meta.url), 'utf8'));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('Jaccard distance and bucket distance', () => {
  near(jaccardDistance(['a', 'b'], ['b', 'c']), 2 / 3);
  near(jaccardDistance(['a'], ['a']), 0);
  near(jaccardDistance([], []), 0);
  near(bucketDistance({ additive: 2, multiplicative: 1, mainstat: 1, crit: 1, vuln: 1, overpower: 1 }, { additive: 1, multiplicative: 1, mainstat: 1, crit: 1, vuln: 1, overpower: 1 }), 0.5 / 6);
  assert.equal(bucketDistance({ additive: null }, { additive: null }), null);
});

test('an example-only meta file is ignored and an empty real list is fully novel', () => {
  const onlyExampleDoc = {
    builds: [{
      id: 'example',
      name: 'EXAMPLE',
      example: true,
      skills: ['EXAMPLE-skill'],
      aspects: ['EXAMPLE-aspect'],
      uniques: ['EXAMPLE-unique'],
      keyItems: ['EXAMPLE-unique'],
      bucketProfile: { additive: null, multiplicative: null, mainstat: null, crit: null, vuln: null, overpower: null },
      source: 'manual-entry',
      verified: false
    }]
  };
  const none = noveltyAgainstMeta({ skills: ['hota'], aspects: [], uniques: [], keyItems: [] }, { additive: 1 }, onlyExampleDoc);
  assert.equal(none.novelty, 1);
  assert.equal(none.nearestId, null);
  const onlyExample = noveltyAgainstMeta({ skills: ['EXAMPLE-skill'], aspects: ['EXAMPLE-aspect'], uniques: ['EXAMPLE-unique'], keyItems: ['EXAMPLE-unique'] }, {}, onlyExampleDoc);
  assert.equal(onlyExample.novelty, 1);
});

test('the shipped meta row is a real name list with no bucket numbers', () => {
  assert.equal(meta.builds[0].example, false);
  assert.equal(meta.builds[0].verified, false);
  const distance = noveltyAgainstMeta({ skills: ['whirlwind'], aspects: [], uniques: [], keyItems: [] }, {}, meta);
  assert.equal(distance.nearestId, 'ww-d4builds-immortal-speed-130');
  assert.ok(distance.novelty < 1);
  assert.equal(distance.bucket, null);
});

test('a copied meta build scores below a different build of equal power, and the power floor applies', () => {
  const profile = { additive: 1.7, multiplicative: 1.5, mainstat: 1, crit: 1, vuln: 1, overpower: 1 };
  const metaDoc = {
    builds: [
      { id: 'example', name: 'EXAMPLE', example: true, skills: ['clone'], aspects: [], uniques: [], keyItems: [], bucketProfile: profile, source: 'synthetic-fixture', verified: false },
      { id: 'real', name: 'SYNTHETIC real', example: false, skills: ['clone'], aspects: ['same'], uniques: [], keyItems: [], bucketProfile: profile, source: 'synthetic-fixture', verified: false }
    ]
  };
  const clone = noveltyAgainstMeta({ skills: ['clone'], aspects: ['same'], uniques: [], keyItems: [] }, profile, metaDoc);
  const other = noveltyAgainstMeta({ skills: ['other'], aspects: ['different'], uniques: [], keyItems: [] }, { ...profile, additive: 4 }, metaDoc);
  assert.equal(clone.nearestId, 'real');
  assert.ok(clone.novelty < other.novelty);
  const ranked = rankByPowerNovelty([
    { name: 'low', power: 10, novelty: 1, unverifiedShare: 0 },
    { name: 'clone', power: 100, novelty: clone.novelty, unverifiedShare: 0 },
    { name: 'other', power: 100, novelty: other.novelty, unverifiedShare: 0 },
    { name: 'dirty', power: 1000, novelty: 1, unverifiedShare: 0.5 },
    { name: 'weak', power: 1, novelty: 1, unverifiedShare: 0 }
  ], { powerFloor: 50, includeUnverified: false, limit: 20 });
  assert.deepEqual(ranked.map(result => result.name), ['other', 'clone']);
  assert.ok(ranked[0].score > ranked[1].score);
  const withDirty = rankByPowerNovelty([
    { name: 'dirty', power: 1000, novelty: 1, unverifiedShare: 0.5 },
    { name: 'clean', power: 10, novelty: 1, unverifiedShare: 0 }
  ], { includeUnverified: true, powerFloor: 0, limit: 20 });
  assert.equal(withDirty[0].name, 'dirty');
  const capped = rankByPowerNovelty(Array.from({ length: 30 }, (_, index) => ({ name: `b${index}`, power: index + 1, novelty: 1, unverifiedShare: 0 })), { limit: 20 });
  assert.equal(capped.length, 20);
  assert.equal(capped[0].name, 'b29');
});
