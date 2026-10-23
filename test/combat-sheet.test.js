import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const builds = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));
const saved = builds.builds.find(build => build.id === 'users-current-build');
const SOURCE = 'video-model reading 2026-10-23, unconfirmed';
const READINGS = ['headline', 'sheet-includes-gear-x', 'active-weapon', 'sheet-includes-gear-x-active-weapon'];

// One Whirlwind hit. Fractional saved uptimes are pinned so the blend weight on the other state is 0.
function hit(context, kind, extra = {}) {
  const all = context === 'combat-allbuff';
  return {
    ...saved,
    skills: ['whirlwind'],
    uptime: {
      ...saved.uptime,
      estimate: {},
      vulnerable: extra.vulnerable ?? (all ? 1 : 0),
      overpower: kind === 'overpower' ? 1 : 0,
      channeling: 1,
      furyAbove50: 1,
      unstoppable: 1,
      fortified: 1,
      healthyInjured: extra.healthyInjured ?? 0,
      dustDevil: extra.dustDevil ?? (all ? 1 : 0),
      consecutiveWeapon: 1,
      elites: 1,
      playerHealthy: 1,
      missingPotions: 0,
      berserk: extra.berserk ?? (all ? 1 : 0),
      enemyHealthy: extra.enemyHealthy ?? 0,
      enemyInjured: extra.enemyInjured ?? 0
    }
  };
}

function score(context, endpoint, kind, extra = {}, critReading = 'headline') {
  return evaluateBuild(catalog, hit(context, kind, extra), {
    sheetContext: context,
    allbuffEndpoint: endpoint,
    critReading
  });
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${actual} vs ${expected}`);
}

test('the saved build stays on the town sheet and tags the combat reading as unconfirmed', () => {
  assert.equal(saved.sheetContext, 'town');
  assert.equal(saved.critDmg.sources['combat-nobuff'], SOURCE);
  assert.equal(saved.critDmg.sources['combat-allbuff'], SOURCE);
  assert.equal(saved.additivePct.sources['combat-allbuff-high'], SOURCE);
  assert.equal(saved.offensiveSheet.whileBerserking.sources['combat-nobuff'], SOURCE);
  assert.equal(saved.offensiveSheet.overpowerDamage.sources['combat-nobuff'], SOURCE);
  assert.equal(saved.attackSpeed['combat-nobuff'], 120);
  assert.equal(saved.attackSpeed['combat-allbuff'], 120);
  assert.equal(saved.currentFury['combat-nobuff'], 826);
  assert.equal(saved.combatObservations.verified, false);
  assert.equal(saved.combatObservations.source, SOURCE);
  assert.equal(saved.combatObservations.weaponTooltip.applied, false);
  assert.equal(saved.combatObservations.weaponTooltip.name, 'Deathhead of Channeling');
  const town = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'] });
  near(town.result.total, 42398366381.44);
  assert.equal(town.sheetContext, 'town');
  assert.equal(town.currentFuryEstimate, true);
  assert.equal(town.input.critDmg, 7424.8);
  assert.equal(town.input.additivePct, 606.7);
});

test('combat-nobuff and both all-buff endpoints resolve the video sheet and flag hidden rows', () => {
  const nobuff = score('combat-nobuff', 'low', 'normal');
  assert.equal(nobuff.sheetContext, 'combat-nobuff');
  assert.equal(nobuff.input.critChance, 100);
  assert.equal(nobuff.input.critDmg, 10819.5);
  assert.equal(nobuff.input.additivePct, 1755.2);
  assert.equal(nobuff.input.currentFury, 826);
  assert.equal(nobuff.currentFuryEstimate, false);
  assert.equal(nobuff.input.modifiers.some(mod => /attack speed/i.test(mod.name)), false);
  const ram = nobuff.input.modifiers.find(mod => mod.id === 'ramaladni' && mod.bucket === 'multiplicative');
  assert.equal(ram.value, 0.5 * 826);
  assert.equal(nobuff.input.notes.some(note => note.includes(SOURCE)), true);
  assert.equal(nobuff.sheetFallbacks.some(item => item.field === 'weaponDmg' && item.from === 'town' && item.value === 4596), true);
  assert.equal(nobuff.sheetFallbacks.some(item => item.field === 'offensiveSheet.vsElites'), false);

  const low = score('combat-allbuff', 'low', 'normal');
  assert.equal(low.input.additivePct, 1996);
  assert.equal(low.input.critDmg, 10819.5);
  assert.equal(low.input.vulnPct, 2836.8);
  const elites = low.sheetFallbacks.find(item => item.field === 'offensiveSheet.vsElites');
  assert.equal(elites.from, 'combat-nobuff');
  assert.equal(elites.value, 94.1);
  assert.equal(low.sheetFallbacks.some(item => item.field === 'offensiveSheet.whileBerserking' && item.value === 247.9), true);
  assert.equal(low.sheetFallbacks.some(item => item.field === 'offensiveSheet.overpowerDamage' && item.value === 6432.2), true);
  assert.match(low.input.notes.join('\n'), /combat-nobuff value is used for the rows that were not visible/);

  const high = score('combat-allbuff', 'high', 'normal');
  assert.equal(high.input.additivePct, 9897.7);
  assert.equal(high.input.notes.some(note => note.includes('high end of the combat-allbuff ramp')), true);
  assert.equal(high.input.notes.some(note => note.includes('Screenshot-verified')), false);
  assert.equal(high.input.modifiers.some(mod => mod.name === 'while Berserking' && mod.value === 247.9), true);
  assert.equal(nobuff.input.modifiers.some(mod => mod.name === 'while Berserking'), false);
});

test('vs Healthy and vs Injured are separate rows, and Overpower Damage applies on an Overpower hit', () => {
  const mid = score('combat-nobuff', 'low', 'normal');
  assert.equal(mid.input.modifiers.some(mod => mod.name === 'vs Healthy' || mod.name === 'vs Injured' || mod.name === 'vs Healthy or Injured'), false);
  assert.equal(mid.result.buckets.overpower, 1);
  assert.equal(mid.input.modifiers.some(mod => mod.name.startsWith('Earthstriker')), false);

  const healthy = score('combat-nobuff', 'low', 'normal', { vulnerable: 1, enemyHealthy: 1, healthyInjured: 1, berserk: 0, dustDevil: 0 });
  assert.equal(healthy.input.modifiers.some(mod => mod.name === 'vs Healthy' && mod.value === 181.8), true);
  assert.equal(healthy.input.modifiers.some(mod => mod.name === 'vs Injured'), false);
  assert.equal(healthy.input.modifiers.some(mod => mod.value === 75), true);
  near(healthy.result.total, 55408916612.11);

  const injured = score('combat-nobuff', 'low', 'normal', { enemyInjured: 1 });
  assert.equal(injured.input.modifiers.some(mod => mod.name === 'vs Injured' && mod.value === 133.4), true);
  assert.equal(injured.input.modifiers.some(mod => mod.name === 'vs Healthy'), false);

  const overpower = score('combat-nobuff', 'low', 'overpower');
  near(overpower.result.buckets.overpower, 1 + 6432.2 / 100);
  assert.equal(overpower.input.overpowerPct, 6432.2);
  assert.equal(overpower.input.modifiers.some(mod => mod.name.startsWith('Earthstriker') && mod.value === 19.5), true);
  const town = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'] });
  assert.equal(town.input.overpowerPct, 104);
  assert.equal(town.input.modifiers.some(mod => mod.name === 'vs Healthy or Injured' && mod.value === 26), true);
});

test('per-hit predictions under each crit reading', () => {
  const expected = {
    'combat-nobuff': {
      low: {
        normal: [10591728422.51, 1954193435.89, 3673883659.47, 1954193435.89],
        overpower: [992145715678.01, 183052715069.74, 344139104331.12, 183052715069.74]
      }
    },
    'combat-allbuff': {
      low: {
        normal: [28916905658.21, 5335222446.16, 10030218198.79, 5335222446.16],
        overpower: [2708697099755.43, 499759612501.00, 939548071501.88, 499759612501.00]
      },
      high: {
        normal: [42341465068.30, 7812078425.89, 14686707440.66, 7812078425.89],
        overpower: [3966199045828.55, 731771041665.78, 1375729558331.67, 731771041665.78]
      }
    }
  };
  for (const [context, endpoints] of Object.entries(expected)) {
    for (const [endpoint, kinds] of Object.entries(endpoints)) {
      for (const [kind, totals] of Object.entries(kinds)) {
        const scores = READINGS.map(reading => score(context, endpoint, kind, {}, reading).result.total);
        scores.forEach((total, index) => near(total, totals[index]));
        assert.equal(scores[1], scores[3]);
      }
    }
  }
  const healthyHigh = score('combat-allbuff', 'high', 'normal', {
    vulnerable: 1,
    enemyHealthy: 1,
    healthyInjured: 1
  });
  near(healthyHigh.result.total, 94043985148.16);
});
