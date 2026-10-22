import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatNeedsInput, needsInput, openNeeds, pendingAllocation } from '../src/needs-input.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));

test('needs-input lists nulls, unverified flags, ranges, and empty collections', () => {
  const items = needsInput({
    skills: [{ id: 'sample', coeffPct: null, verified: false, effects: [{ value: [1, 2] }] }],
    affixes: []
  });
  const paths = items.map(item => `${item.path} ${item.reason}`);
  assert.ok(paths.includes('/skills/sample/coeffPct null'));
  assert.ok(paths.includes('/skills/sample/verified unverified'));
  assert.ok(paths.some(path => path.startsWith('/skills/sample/effects/0/value range')));
  assert.ok(paths.includes('/affixes empty'));
  const hidden = needsInput({
    skills: [{ id: 'idle', allocated: false, coeffPct: null, verified: false }]
  });
  assert.equal(hidden.some(item => item.path.includes('idle')), false);
});

test('transcribed coefficients stay unverified and the sourced scalar stays put', () => {
  const items = needsInput(catalog);
  const text = formatNeedsInput(items);
  assert.match(text, /\/skills\/hota\/verified — unverified/);
  assert.equal(text.includes('/skills/hota/coeffPct — null'), false);
  assert.match(text, /\/aspects\/writhing\/effects\/0\/value — range/);
  assert.match(text, /\/skillVariants — empty/);
  assert.match(text, /\/talismans — empty/);
  assert.equal(text.includes('/affixes — empty'), false);
  assert.equal(text.includes('/affixes/guardian-finesse/'), false);
  assert.match(text, /\/skills\/hota\/allocated — pending-allocation/);
  assert.equal(items.some(item => item.path === '/skills/hota/allocated' && item.reason === 'null'), false);
  assert.equal(catalog.skills.find(skill => skill.id === 'flay').allocated, true);
  assert.equal(openNeeds(items).some(item => item.reason === 'pending-allocation'), false);
  assert.ok(pendingAllocation(items).length > 0);
  assert.equal(items.some(item => item.path === '/mainstat/percentPer10'), false);
  assert.equal(items.some(item => item.path === '/glyphs/disembowel/effects/0/value'), false);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').coeffPct, 170);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').verified, false);
  assert.ok(items.length > 20);
});
