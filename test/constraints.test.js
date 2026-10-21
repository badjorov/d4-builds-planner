import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blankBuild } from '../src/catalog.js';
import { checkBuild, effectiveHp, furyBalance } from '../src/constraints.js';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/synthetic-catalog.json', import.meta.url), 'utf8'));

function build(patch = {}) {
  return blankBuild(catalog, {
    id: 'b',
    name: 'b',
    skills: ['alpha'],
    rotation: [{ skillId: 'alpha', castsPerSecond: 1 }],
    ...patch
  });
}

function put(build, slotId, assignment) {
  const slot = build.gear.find(item => item.slotId === slotId);
  Object.assign(slot, assignment);
  return build;
}

test('fury sustain is generation minus spend per second', () => {
  const ok = furyBalance(catalog, build());
  assert.equal(ok.unknown, false);
  assert.equal(ok.generatedPerSecond, 10);
  assert.equal(ok.spentPerSecond, 4);
  assert.equal(ok.perSecond, 6);
  const unknown = furyBalance(catalog, build({ rotation: [{ skillId: 'alpha', castsPerSecond: null }] }));
  assert.equal(unknown.perSecond, null);
  assert.equal(unknown.unknown, true);
});

test('fury, uptime, and EHP minimums reject builds that cannot clear them', () => {
  const above = checkBuild(catalog, build({ uptime: { berserk: 0.8, vulnerable: 1, overpower: 1 }, defense: { life: 1000, armor: null, resists: null, armorMitigationPct: 10, resistMitigationPct: 0, dr: [20] } }), {
    furyPerSecond: 5, berserk: 0.5, vulnerable: 0.5, overpower: 0.5, ehp: 1000
  });
  assert.equal(above.ok, true, JSON.stringify(above.violations));
  const below = checkBuild(catalog, build({ uptime: { berserk: 0.2, vulnerable: null, overpower: 0 }, defense: { life: 1000, armor: 500, resists: null, armorMitigationPct: null, resistMitigationPct: 0, dr: [20] } }), {
    furyPerSecond: 7, berserk: 0.5, vulnerable: 0.5, overpower: 0.5, ehp: 1000
  });
  const codes = below.violations.map(item => item.code);
  assert.ok(codes.includes('fury-sustain'));
  assert.ok(codes.includes('uptime'));
  assert.ok(codes.includes('ehp'));
  assert.equal(below.rejected, true);
});

test('EHP uses life, mitigation fractions, and DR, and does not convert armor rating', () => {
  const hp = effectiveHp({ life: 1000, armor: null, resists: null, armorMitigationPct: 10, resistMitigationPct: 0, dr: [20] });
  assert.ok(Math.abs(hp.ehp - (1000 / 0.72)) < 1e-9);
  const missing = effectiveHp({ life: 1000, armor: 500, resists: 30, armorMitigationPct: null, resistMitigationPct: 0, dr: [] });
  assert.equal(missing.ehp, null);
  assert.match(missing.reason, /Armor mitigation/);
});

test('skill bar, one aspect per slot, and fixed unique slots are enforced', () => {
  const crowded = build({ skills: ['alpha', 'beta', 'gamma'] });
  assert.ok(checkBuild(catalog, crowded).violations.some(item => item.code === 'skill-bar'));
  const both = put(build(), 'helm', { aspectId: 'synth-helm-only', uniqueId: 'synth-ring' });
  assert.ok(checkBuild(catalog, both).violations.some(item => item.code === 'aspect-and-unique' || item.code === 'unique-slot'));
  const dup = build();
  put(dup, 'chest', { aspectId: 'synth-mult' });
  put(dup, 'gloves', { aspectId: 'synth-mult' });
  assert.ok(checkBuild(catalog, dup).violations.some(item => item.code === 'duplicate-aspect'));
  const wrong = put(build(), 'helm', { uniqueId: 'synth-ring' });
  assert.ok(checkBuild(catalog, wrong).violations.some(item => item.code === 'unique-slot'));
  const legal = put(build(), 'ring-1', { uniqueId: 'synth-ring' });
  assert.equal(checkBuild(catalog, legal).ok, true);
  const unknown = put(build(), 'chest', { uniqueId: 'synth-mystery' });
  assert.ok(checkBuild(catalog, unknown).violations.some(item => item.code === 'unique-slot-unknown'));
});

test('null playability minimums do not reject an otherwise legal build', () => {
  assert.equal(checkBuild(catalog, build()).ok, true);
});
