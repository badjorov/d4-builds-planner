import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MASTERWORK_MARK, MASTERWORK_UPLIFT } from '../src/masterwork.js';
import { scoreS16 } from '../src/s16-score.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('screenshot rolls above the base range are a masterwork uplift', () => {
  const leoric = MASTERWORK_UPLIFT.find(item => item.id === 'leorics-crown');
  const gohr = MASTERWORK_UPLIFT.find(item => item.id === 'gohrs-devastating-grips');
  const tibault = MASTERWORK_UPLIFT.find(item => item.id === 'tibaults-will');
  assert.equal(leoric.actual, 65);
  assert.ok(Math.abs(leoric.upliftVsMax - 1.3) < 1e-12);
  assert.deepEqual(gohr.actual, [98, 117]);
  assert.ok(Math.abs(gohr.upliftVsMax - 1.3) < 1e-12);
  assert.equal(tibault.actual, 26);
  assert.ok(Math.abs(tibault.upliftVsMax - 1.3) < 1e-12);
  const doc = readFileSync(new URL('../docs/data-import-validation.md', import.meta.url), 'utf8');
  assert.match(doc, new RegExp(MASTERWORK_MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal((doc.match(/expected: masterwork\/transfigure/g) || []).length, 3);
  const mismatch = doc.split('## Mismatches first')[1] || '';
  assert.doesNotMatch(mismatch, /Leoric's Crown, gem effect/);
  assert.doesNotMatch(mismatch, /Gohr's Devastating Grips, Whirlwind increased damage/);
  assert.doesNotMatch(mismatch, /Tibault's Will, damage while Unstoppable/);
  const catalog = read('../data/barbarian.json');
  assert.equal(catalog.uniques.find(item => item.id === 'leorics-crown').effects.find(effect => effect.stat === 'gem effect').value, 65);
  assert.deepEqual(catalog.uniques.find(item => item.id === 'gohrs-devastating-grips').effects.find(effect => effect.kind === 'damage').range, [98, 117]);
  assert.equal(catalog.uniques.find(item => item.id === 'tibaults-will').effects.find(effect => effect.stat === 'damage while Unstoppable').value, 26);
});

test('the three provisional Season 16 builds score without soul stacks', () => {
  const file = read('../data/s16-builds.json');
  assert.equal(file.season, 16);
  assert.equal(file.provisional, true);
  assert.equal(file.souls, 0);
  assert.equal(file.builds.length, 3);
  const swing = file.builds.find(build => build.id === 's16-double-swing');
  assert.equal(swing.placeholder.status, 'waiting');
  assert.deepEqual(swing.unresolved, ['1H Mace Expertise']);
  assert.ok(swing.sources[0].startsWith('https://'));
  const catalog = read('../data/barbarian.json');
  const saved = read('../data/builds.json');
  const build = saved.builds.find(entry => entry.id === 'users-current-build');
  const scores = scoreS16(catalog, build);
  assert.equal(scores.length, 3);
  for (const row of scores) {
    assert.ok(row.min.peak < row.max.peak);
    assert.ok(row.min.average < row.max.average);
    assert.equal(row.fury, 826);
  }
  const doc = readFileSync(new URL('../docs/s16-builds.md', import.meta.url), 'utf8');
  assert.match(doc, /provisional/);
  assert.match(doc, /1H Mace Expertise/);
  assert.match(doc, /placeholder/);
  assert.match(doc, /2,426\.80B|Soul Splinter|souls are 0|no soul/i);
  assert.match(doc, /bleed/);
});
