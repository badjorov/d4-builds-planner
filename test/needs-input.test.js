import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { damageEffects } from '../src/catalog.js';
import { countProvenance, formatNeedsInput, needsInput, openNeeds, pendingAllocation, splitForBuild, topFieldNames } from '../src/needs-input.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const saved = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));

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
  assert.match(text, /\/skills\/whirlwind\/verified — unverified/);
  assert.equal(text.includes('/skills/hota/'), false);
  assert.equal(text.includes('/skills/flay/'), false);
  assert.match(text, /\/aspects\/writhing\/effects\/0\/value — range/);
  assert.match(text, /\/skillVariants — empty/);
  assert.equal(text.includes('/passives'), false);
  assert.equal(text.includes('/talismans — empty'), false);
  assert.match(text, /\/talismans\/tuskhelm-of-joritz-the-mighty\/verified — unverified/);
  assert.equal(text.includes('/affixes — empty'), false);
  assert.equal(text.includes('/affixes/guardian-finesse/'), false);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').allocated, false);
  assert.equal(catalog.skills.find(skill => skill.id === 'flay').allocated, false);
  assert.equal(catalog.skills.find(skill => skill.id === 'whirlwind').allocationVerified, true);
  assert.equal(catalog.skills.find(skill => skill.id === 'whirlwind').verified, false);
  assert.equal(openNeeds(items).some(item => item.reason === 'pending-allocation'), false);
  assert.equal(pendingAllocation(items).length, 0);
  const pending = needsInput({
    skills: [{ id: 'key-passive', category: 'Passive', allocated: null, coeffPct: null, verified: false }]
  });
  assert.equal(pendingAllocation(pending).length, 1);
  assert.equal(pendingAllocation(pending)[0].path, '/skills/key-passive/allocated');
  assert.equal(items.some(item => item.path === '/mainstat/percentPer10'), false);
  assert.equal(items.some(item => item.path === '/glyphs/disembowel/effects/0/value'), false);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').coeffPct, 170);
  assert.equal(catalog.skills.find(skill => skill.id === 'hota').verified, false);
  assert.ok(items.length > 20);
});

test('inactive skills and upgrades stay out of needs-input, and the remaining skill fields are active', () => {
  const items = needsInput(catalog).filter(item => item.path.startsWith('/skills/'));
  const active = new Set(catalog.skills.filter(skill => skill.allocated === true).map(skill => skill.id));
  assert.equal(items.length, 98);
  for (const item of items) {
    const id = item.path.split('/')[2];
    assert.equal(active.has(id), true, item.path);
    const modifier = item.path.match(/\/modifiers\/(\d+)/);
    if (!modifier) continue;
    const skill = catalog.skills.find(entry => entry.id === id);
    assert.equal(skill.modifiers[Number(modifier[1])].allocated, true, item.path);
  }
  for (const skill of catalog.skills.filter(entry => entry.allocated === false)) {
    assert.equal(items.some(item => item.path.startsWith(`/skills/${skill.id}/`)), false, skill.id);
  }
});

test('needs-input splits the user build into engine-blocking, required, and nice-to-have', () => {
  const build = saved.builds.find(entry => entry.id === 'users-current-build');
  const items = [
    ...needsInput(catalog),
    ...needsInput(saved, '/builds.json')
  ];
  const split = splitForBuild(items, build, catalog);
  assert.equal(split.engineBlocking.length + split.required.length + split.niceToHave.length, items.length);
  for (const group of [split.engineBlocking, split.required, split.niceToHave]) {
    assert.equal(group.some(item => item.path.startsWith('/skills/flay/')), false);
  }
  assert.equal(split.niceToHave.some(item => item.path.startsWith('/aspects/accelerating/')), true);
  assert.equal(split.engineBlocking.some(item => item.path.startsWith('/aspects/accelerating/')), false);
  assert.equal(split.niceToHave.some(item => item.path.startsWith('/glyphs/might/')), true);
  assert.equal(split.engineBlocking.some(item => item.path.startsWith('/glyphs/')), false);
  assert.equal(split.required.some(item => item.path.startsWith('/glyphs/')), false);
  assert.equal(split.niceToHave.some(item => item.path.startsWith('/glyphs/disembowel/')), true);
  assert.equal(split.niceToHave.some(item => item.path === '/aspects/crushing-aspect/slots'), true);
  assert.equal(split.niceToHave.some(item => item.path.includes('/aspects/crushing-aspect/effects/') && item.path.endsWith('/stacking')), true);
  assert.equal(split.required.some(item => item.path === '/builds.json/builds/users-current-build/overpowerPct'), false);
  assert.equal(saved.builds.find(entry => entry.id === 'users-current-build').overpowerPct, 104);
  for (const id of ['war-cry', 'rallying-cry', 'iron-skin', 'wrath-of-the-berserker']) {
    assert.equal(catalog.skills.find(skill => skill.id === id).coeffPct, 0);
    assert.equal(split.required.some(item => item.path === `/skills/${id}/coeffPct`), false);
  }
  assert.equal(catalog.skills.find(skill => skill.id === 'whirlwind').dot, false);
  assert.equal(split.engineBlocking.some(item => item.path === '/skills/whirlwind/dot'), false);
  const crushingConditions = split.engineBlocking.filter(item => item.path.startsWith('/aspects/crushing-aspect/effects/') && item.path.endsWith('/conditions'));
  assert.equal(crushingConditions.length, 0);
  const crushing = catalog.aspects.find(aspect => aspect.id === 'crushing-aspect');
  assert.deepEqual(crushing.effects[0].conditions, ['while Fortified']);
  assert.equal(crushing.effects[0].kind, 'damage');
  const gohr = catalog.uniques.find(item => item.id === 'gohrs-devastating-grips').effects[1];
  assert.equal(gohr.bucket, 'multiplicative');
  assert.equal(gohr.value, 117);
  assert.equal(split.engineBlocking.some(item => item.path === '/uniques/gohrs-devastating-grips/effects/1/bucket'), false);
  assert.equal(split.engineBlocking.some(item => item.path === '/uniques/ramaladni/effects/1/bucket'), false);
  const perHit = catalog.uniques.find(item => item.id === 'insight').effects.find(effect => effect.stat === 'damage per hit');
  assert.equal(perHit.kind, 'base-weapon');
  assert.equal(perHit.value, null);
  assert.equal(split.niceToHave.some(item => item.path === '/uniques/insight/effects/0/bucket'), true);
  assert.equal(split.engineBlocking.every(item => item.provenance === 'user-only' || item.provenance === 'sourceable'), true);
  assert.equal(split.required.every(item => item.provenance === 'user-only' || item.provenance === 'sourceable'), true);
  assert.equal(split.niceToHave.every(item => item.provenance == null), true);
  const blocking = countProvenance(split.engineBlocking);
  assert.equal(blocking['user-only'] + blocking.sourceable, split.engineBlocking.length);
  assert.equal(split.engineBlocking.length, 0);
  assert.equal(topFieldNames(split.engineBlocking).length, 0);
  assert.equal(split.engineBlocking.some(item => item.path.endsWith('/armorMitigationPct')), false);
  assert.equal(split.engineBlocking.some(item => item.path.endsWith('/resistMitigationPct')), false);
});

test('channeling and fortified conditions stay unknown, and a skill tag still matches', () => {
  const catalogTags = { skills: [{ id: 'whirlwind', tags: ['Core', 'bleed'] }] };
  const build = { skills: ['whirlwind'], uptime: { overpower: 1 } };
  const channel = damageEffects({
    effects: [{ stat: 'damage', bucket: 'multiplicative', value: 69, conditions: ['while channeling a Skill'] }]
  }, build, catalogTags);
  assert.equal(channel[0].state, 'unknown');
  const fortified = damageEffects({
    effects: [{ stat: 'damage', bucket: 'multiplicative', value: 64, conditions: ['while Fortified'] }]
  }, build, catalogTags);
  assert.equal(fortified[0].state, 'unknown');
  const overpower = damageEffects({
    effects: [{ stat: 'damage', bucket: 'multiplicative', value: 19.5, conditions: ['while you have Overpower'] }]
  }, build, catalogTags);
  assert.equal(overpower[0].state, 'active');
  const bleed = damageEffects({
    effects: [{ stat: 'damage', bucket: 'multiplicative', value: 15, conditions: ['bleed'] }]
  }, build, catalogTags);
  assert.equal(bleed[0].state, 'active');
  const other = damageEffects({
    effects: [{ stat: 'damage', bucket: 'multiplicative', value: 15, conditions: ['burn'] }]
  }, build, catalogTags);
  assert.equal(other.length, 0);
});
