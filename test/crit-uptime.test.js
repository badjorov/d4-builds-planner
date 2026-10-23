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

test('the sheet crit percent is additive and the weapon [x] lines sum', () => {
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const crit = evaluated.result.terms.find(term => term.label === 'Crit (expected)');
  assert.equal(evaluated.input.modifiers.some(mod => mod.bucket === 'crit'), false);
  const critMult = evaluated.input.modifiers.filter(mod => mod.bucket === 'crit-mult').map(mod => mod.value).sort((a, b) => a - b);
  assert.deepEqual(critMult, [44, 88, 310]);
  assert.equal(evaluated.input.modifiers.some(mod => mod.bucket === 'multiplicative' && (mod.value === 310 || mod.value === 88 || mod.value === 44 || mod.value === 35)), false);
  assert.equal(evaluated.input.modifiers.some(mod => mod.bucket === 'vuln-mult' && mod.value === 35 && mod.when === 'vulnerable'), true);
  assert.ok(crit.value < 75.248);
  assert.equal(crit.expr.includes('× 1.5'), false);
  assert.equal(crit.expr.includes('gear [x]'), true);
  assert.equal(evaluated.critReading, 'headline');
  assert.equal(evaluated.critAlternate.reading, 'sheet-includes-gear-x');
  assert.ok(evaluated.critAlternate.total < evaluated.result.total);
  const vuln = evaluated.result.terms.find(term => term.label === 'Vulnerable');
  assert.ok(Math.abs(vuln.value - 1.2 * 1.35) < 1e-9);
});

test('Ramaladni multiplies 0.5%[x] by the stored Max Fury', () => {
  assert.equal(saved.maxFury.town, 826);
  assert.equal(saved.maxFury.combat, null);
  const ram = catalog.uniques.find(entry => entry.id === 'ramaladni');
  const line = ram.effects.find(effect => effect.stat === 'damage per point of Fury');
  assert.equal(line.value, 0.5);
  assert.match(line.note, /per point of Fury/);
  const evaluated = evaluateBuild(catalog, whirlwindBuild());
  const applied = evaluated.input.modifiers.find(mod => mod.id === 'ramaladni' && mod.bucket === 'multiplicative');
  assert.equal(applied.value, 0.5 * 826);
  assert.ok(Math.abs(evaluated.result.total - 56001684701.70) < 0.01);
  const bare = evaluateBuild(catalog, { ...whirlwindBuild(), maxFury: null, currentFury: { town: null, combat: null } });
  const once = bare.input.modifiers.find(mod => mod.id === 'ramaladni' && mod.bucket === 'multiplicative');
  assert.equal(once.value, 0.5);
  assert.equal(bare.currentFuryEstimate, false);
  assert.equal(evaluated.currentFuryEstimate, true);
  assert.equal(evaluated.input.currentFury, 826);
  assert.match(evaluated.input.notes.join('\n'), /estimate/);
  assert.equal(saved.maxFury.town, 826);
});

test('sheetContext selects the combat reading and falls back to town', () => {
  const build = {
    ...whirlwindBuild(),
    sheetContext: 'combat',
    critDmg: { town: 7424.8, combat: 8000 },
    weaponDmg: { town: 4596, combat: null },
    currentFury: { town: null, combat: 400 }
  };
  const combat = evaluateBuild(catalog, build, { sheetContext: 'combat' });
  assert.equal(combat.sheetContext, 'combat');
  assert.equal(combat.input.critDmg, 8000);
  assert.equal(combat.input.weaponDmg, 4596);
  assert.equal(combat.sheetFallbacks.some(item => item.field === 'weaponDmg' && item.town === 4596), true);
  assert.equal(combat.sheetFallbacks.some(item => item.field === 'critDmg'), false);
  assert.match(combat.input.notes.join('\n'), /Weapon Damage/);
  assert.match(combat.input.notes.join('\n'), /No combat value is stored/);
  const ram = combat.input.modifiers.find(mod => mod.id === 'ramaladni' && mod.bucket === 'multiplicative');
  assert.equal(ram.value, 0.5 * 400);
  assert.equal(combat.currentFuryEstimate, false);
  const town = evaluateBuild(catalog, build, { sheetContext: 'town' });
  assert.equal(town.sheetContext, 'town');
  assert.equal(town.input.critDmg, 7424.8);
  assert.equal(town.input.weaponDmg, 4596);
  assert.equal(town.sheetFallbacks.length, 0);
  assert.equal(town.input.notes.some(note => note.includes('No combat value is stored')), false);
  assert.equal(saved.weaponDmg.town, 4596);
  assert.equal(saved.sheetContext, 'town');
});

test('critAudit.reading switches the gear crit lines', () => {
  const build = whirlwindBuild();
  const headline = evaluateBuild(catalog, build, { critReading: 'headline' });
  const active = evaluateBuild(catalog, build, { critReading: 'active-weapon' });
  const sheet = evaluateBuild(catalog, build, { critReading: 'sheet-includes-gear-x' });
  const both = evaluateBuild(catalog, build, { critReading: 'sheet-includes-gear-x-active-weapon' });
  assert.deepEqual(active.input.modifiers.filter(mod => mod.bucket === 'crit-mult').map(mod => mod.value), [88]);
  assert.equal(sheet.input.modifiers.some(mod => mod.bucket === 'crit-mult'), false);
  assert.equal(both.result.total, sheet.result.total);
  assert.ok(sheet.result.total < active.result.total);
  assert.ok(active.result.total < headline.result.total);
  assert.equal(catalog.skills.find(skill => skill.id === 'whirlwind').activeWeaponSlot, 'weapon-2');
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
  for (const id of ['flawless-technique', 'wrath']) {
    assert.equal(evaluated.input.modifiers.some(mod => mod.id === id), false, id);
  }
  const imbiber = evaluated.input.modifiers.find(mod => mod.id === 'imbiber');
  assert.equal(imbiber.value, 16);
  assert.equal(imbiber.when, undefined);
  assert.equal(evaluated.input.modifiers.some(mod => mod.value === 5 && mod.id === 'imbiber'), false);
  const twister = evaluated.input.modifiers.find(mod => mod.id === 'twister');
  assert.equal(twister.value, 13);
  assert.equal(twister.when, undefined);
  const marshal = evaluated.input.modifiers.find(mod => mod.id === 'marshal');
  assert.equal(marshal.value, 13.5);
  assert.equal(marshal.when, undefined);
  const healthy = evaluated.input.modifiers.filter(mod => mod.when === 'healthyInjured');
  assert.deepEqual(healthy.map(mod => mod.value).sort((a, b) => a - b), [26, 26, 75]);
  assert.equal(healthy.find(mod => mod.sheetConditional)?.name, 'vs Healthy or Injured');
  assert.equal(healthy.find(mod => mod.id === 'might')?.value, 26);
  assert.equal(evaluated.input.modifiers.some(mod => mod.value === 39.9 || mod.value === 39.8 || mod.value === 17.8), false);
  assert.equal(evaluated.input.notes.some(note => note.includes('Twister') && note.includes('not multiplied')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('Imbiber') && note.includes('factor is 1.0')), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.name === 'while you are Healthy' && mod.value === 223.2), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.name === 'while Fortified' && mod.value === 35), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.name === 'Damage with Physical' && mod.value === 250.5), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.name === 'vs Elites' && mod.when === 'elites' && mod.value === 133.5), true);
  assert.equal(evaluated.input.modifiers.some(mod => mod.name === 'Vulnerable Damage' && mod.when === 'vulnerable' && mod.value === 208.8), true);
  assert.equal(evaluated.input.modifiers.filter(mod => mod.name === 'vs Healthy or Injured').length, 1);
  const vulnTerm = evaluated.result.terms.find(term => term.label === 'Vulnerable');
  assert.ok(Math.abs(vulnTerm.value - 1.2 * 1.35) < 1e-9);
  assert.equal(evaluated.input.notes.some(note => note.includes('Wrath') && note.includes('7424.8')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('Flawless Technique') && note.includes('condition unknown')), true);
  assert.equal(evaluated.input.notes.some(note => note.includes('alternate reading')), true);
  const add = evaluated.result.terms.find(term => term.label === 'Additive');
  assert.ok(add.value > 1 + 606.7 / 100);
  assert.equal(add.expr.includes('sheet All Damage'), true);
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
  const on = evaluateBuild(catalog, { ...whirlwindBuild(), uptime: { ...saved.uptime, healthyInjured: 1 } });
  const down = evaluateBuild(catalog, { ...whirlwindBuild(), uptime: { ...saved.uptime, healthyInjured: 0 } });
  const blended = 0.7 * on.result.total + 0.3 * down.result.total;
  assert.ok(Math.abs(evaluated.result.total - blended) / blended < 1e-9);
  assert.equal(evaluated.conditionalCritAlternate.multiplier, 1.45);
  assert.ok(evaluated.conditionalCritAlternate.total > evaluated.result.total);
  const wrathOnly = evaluateBuild(catalog, { ...saved, skills: ['wrath-of-the-berserker'] });
  assert.equal(wrathOnly.input.modifiers.some(mod => mod.id === 'twister'), false);
  assert.equal(wrathOnly.conditionalCritAlternate, null);
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
