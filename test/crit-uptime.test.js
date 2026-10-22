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

test('equipped boards score Warbringer, and unset conditions or glyph levels stay off', () => {
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const ids = evaluated.input.modifiers.map(mod => mod.id);
  assert.equal(ids.includes('warbringer-legendary'), true);
  for (const id of ['decimator-legendary', 'weapons-master-legendary', 'flawless-technique', 'might', 'twister', 'imbiber', 'marshal', 'wrath']) {
    assert.equal(ids.includes(id), false);
  }
  assert.equal(evaluated.input.notes.some(note => note.includes('Twister') && note.includes('glyph level')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('Decimator') && note.includes('condition unknown')), true);
  const skill = catalog.skills.find(entry => entry.id === 'whirlwind');
  const copied = buildFromCore(catalog, [skill], { boards: saved.boards, glyphs: saved.glyphs, uptime: saved.uptime });
  assert.equal(evaluateBuild(catalog, copied).input.modifiers.some(mod => mod.id === 'warbringer-legendary'), true);
  const bare = buildFromCore(catalog, [skill], { uptime: saved.uptime });
  assert.equal(evaluateBuild(catalog, bare).input.modifiers.some(mod => mod.id === 'warbringer-legendary'), false);
});
