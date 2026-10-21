import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatNeedsInput, needsInput } from '../src/needs-input.js';

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
});

test('the migrated catalog asks for unknown Hammer data and keeps the sourced scalar', () => {
  const items = needsInput(catalog);
  const text = formatNeedsInput(items);
  assert.match(text, /\/skills\/hota\/coeffPct — null/);
  assert.match(text, /\/skills\/hota\/verified — unverified/);
  assert.match(text, /\/aspects\/writhing\/effects\/0\/value — range/);
  assert.match(text, /\/skillVariants — empty/);
  assert.match(text, /\/affixes — empty/);
  assert.match(text, /\/talismans — empty/);
  assert.equal(items.some(item => item.path === '/mainstat/percentPer10'), false);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').coeffPct, null);
  assert.ok(items.length > 20);
});
