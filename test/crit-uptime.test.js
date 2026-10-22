import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { damageEffects, evaluateBuild } from '../src/catalog.js';
import { buildFromCore } from '../src/search.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const builds = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));
const saved = builds.builds.find(build => build.id === 'users-current-build');

function whirlwindBuild() {
  return { ...saved, id: 'users-whirlwind-only', name: 'Whirlwind', skills: ['whirlwind'] };
}

test('the sheet crit total is the only crit input, and both readings are reported', () => {
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const crit = evaluated.result.terms.find(term => term.label === 'Crit (expected)');
  assert.equal(crit.value, 75.248);
  assert.equal(evaluated.input.modifiers.some(mod => mod.bucket === 'crit'), false);
  assert.equal(evaluated.input.modifiers.some(mod => mod.value === 310 || mod.value === 88 || mod.value === 44), false);
  assert.equal(evaluated.critAlternate.verified, false);
  assert.equal(evaluated.critAlternate.factor, 74.248);
  assert.equal(evaluated.critAlternate.bonusFactor, 75.248);
  const ratio = evaluated.critAlternate.total / evaluated.result.total;
  assert.ok(Math.abs(ratio - 74.248 / 75.248) < 1e-9);
});

test('channeling applies the 138% imprint on Whirlwind and leaves the codex 69% off', () => {
  const aspect = catalog.aspects.find(entry => entry.id === 'aspect-of-channeling');
  const onWhirlwind = damageEffects(aspect, whirlwindBuild(), catalog);
  assert.deepEqual(onWhirlwind.map(piece => piece.value), [138]);
  assert.equal(onWhirlwind[0].state, 'active');
  const onWrath = damageEffects(aspect, { ...saved, skills: ['wrath-of-the-berserker'] }, catalog);
  assert.equal(onWrath.length, 0);
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const channel = evaluated.input.modifiers.filter(mod => mod.name.startsWith('Aspect of Channeling'));
  assert.equal(channel.length, 1);
  assert.equal(channel[0].value, 138);
});

test('Fury above 50 at 1 applies Melted Heart fully, and a partial Fury uptime still blends', () => {
  const union = Number((1 - (1 - 8 / 8.45) * (1 - 20.8 / 54.32)).toFixed(6));
  assert.equal(saved.uptime.unstoppable, union);
  assert.equal(saved.uptime.furyAbove50, 1);
  assert.equal(saved.uptime.estimate.furyAbove50, false);
  assert.equal(saved.uptime.estimate.fortified, false);
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  assert.equal(evaluated.input.modifiers.some(mod => mod.value === 64 && mod.name.startsWith('Crushing')), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.value === 30 && mod.when == null), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.when === 'unstoppable' && mod.value === 26), true);
  const war = evaluated.input.modifiers.find(mod => mod.id === 'warbringer-legendary');
  assert.equal(war.value, 45);
  assert.equal(war.when, undefined);
  const partial = evaluateBuild(catalog, {
    ...whirlwindBuild(),
    uptime: { ...saved.uptime, furyAbove50: 0.9 }
  });
  assert.equal(partial.input.modifiers.some(mod => mod.when === 'furyAbove50' && mod.value === 30), true);
  assert.ok(evaluated.result.total > partial.result.total);
  const always = evaluateBuild(catalog, {
    ...whirlwindBuild(),
    uptime: { ...saved.uptime, unstoppable: 1 }
  });
  assert.ok(always.result.total > evaluated.result.total);
});

test('Decimator joins the Vulnerable and Overpower states, and Might 8% is on for a two-handed arsenal', () => {
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const decimator = evaluated.input.modifiers.filter(mod => mod.id === 'decimator-legendary');
  assert.equal(decimator.find(mod => mod.when === 'vulnerable')?.value, 20);
  assert.equal(decimator.find(mod => mod.when === 'overpower')?.value, 20);
  const might = evaluated.input.modifiers.find(mod => mod.id === 'might');
  assert.equal(might.value, 8);
  assert.equal(might.when, undefined);
  const earth = evaluated.input.modifiers.find(mod => mod.name.startsWith('Earthstriker'));
  assert.equal(earth.value, 19.5);
  assert.equal(earth.when, undefined);
  for (const id of ['weapons-master-legendary', 'flawless-technique', 'twister', 'imbiber', 'marshal', 'wrath']) {
    assert.equal(evaluated.input.modifiers.some(mod => mod.id === id), false);
  }
  assert.equal(evaluated.input.notes.some(note => note.includes('Twister') && note.includes('level-scaling formula')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('Healthy and Injured share is pending')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('Flawless Technique') && note.includes('condition unknown')), true);
  const skill = catalog.skills.find(entry => entry.id === 'whirlwind');
  const hands = Object.fromEntries((saved.gear || []).filter(slot => slot.hands).map(slot => [slot.slotId, slot.hands]));
  const copied = buildFromCore(catalog, [skill], {
    boards: saved.boards,
    glyphs: saved.glyphs,
    uptime: saved.uptime,
    slotHands: hands
  });
  const copiedEval = evaluateBuild(catalog, copied);
  assert.equal(copiedEval.input.modifiers.some(mod => mod.id === 'warbringer-legendary'), true);
  assert.equal(copiedEval.input.modifiers.some(mod => mod.id === 'might' && mod.value === 8), true);
  const bare = buildFromCore(catalog, [skill], { uptime: saved.uptime });
  assert.equal(evaluateBuild(catalog, bare).input.modifiers.some(mod => mod.id === 'warbringer-legendary'), false);
  const off = evaluateBuild(catalog, {
    ...whirlwindBuild(),
    uptime: { ...saved.uptime, vulnerable: 0, overpower: 0 }
  });
  assert.equal(off.input.modifiers.some(mod => mod.id === 'decimator-legendary'), false);
});

test('a provisional glyph scores only from a stored level-scaling formula', () => {
  const formula = 'min + (max - min) * (level - 1) / (maxLevel - 1)';
  const mini = {
    meta: { class: 'Barbarian' },
    mainstat: { verified: false },
    skills: [{ id: 'whirlwind', name: 'Whirlwind', tags: ['Core'], coeffPct: 100, dot: false }],
    aspects: [],
    uniques: [],
    paragonNodes: [],
    glyphs: [{
      id: 'scaled',
      name: 'Scaled',
      provisional: true,
      effects: [{
        stat: 'damage',
        bucket: 'multiplicative',
        value: 1,
        conditions: [],
        stacking: null,
        source: 'test',
        verified: false,
        range: [10, 20],
        upgrade: { formula, maxLevel: 100 }
      }]
    }],
    constraints: { gearSlots: [] }
  };
  const build = {
    skills: ['whirlwind'],
    gear: [],
    boards: [],
    glyphs: [{ glyphId: 'scaled', level: 133, provisional: true }],
    uptime: {},
    weaponDmg: 100,
    mainStat: 0,
    critChance: 0,
    critDmg: 0
  };
  const scaled = evaluateBuild(mini, build);
  const expected = 10 + (20 - 10) * (133 - 1) / (100 - 1);
  assert.equal(scaled.input.modifiers[0].value, expected);
  assert.equal(scaled.result.total, 100 * (1 + expected / 100));
});
