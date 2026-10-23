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
  near(town.result.total, 46191544367.22);
  assert.equal(town.souls, 15);
  assert.equal(town.soulsEstimate, true);
  assert.ok(Math.abs(town.soulFactor - (1 + 0.041 * 15)) < 1e-9);
  assert.equal(town.input.modifiers.some(mod => mod.id === 'leorics-crown'), false);
  const soulMods = town.input.modifiers.filter(mod => mod.perSoul != null || mod.id === 'splinter-of-the-black-soulstone');
  assert.equal(soulMods.length, 1);
  assert.equal(soulMods[0].id, 'splinter-of-the-black-soulstone');
  assert.equal(soulMods[0].perSoul, 4.1);
  assert.ok(Math.abs(soulMods[0].value - 61.5) < 1e-9);
  assert.equal(saved.splinter.slotId, 'helm');
  assert.match(town.input.notes.join('\n'), /\+15% damage taken/);
  assert.equal(saved.defense.dr.length, 1);
  assert.equal(saved.defense.dr[0], 50);
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
  near(healthy.result.total, 85960999355.00);

  const injured = score('combat-nobuff', 'low', 'normal', { enemyInjured: 1 });
  assert.equal(injured.input.modifiers.some(mod => mod.name === 'vs Injured' && mod.value === 133.4), true);
  assert.equal(injured.input.modifiers.some(mod => mod.name === 'vs Healthy'), false);

  const overpower = score('combat-nobuff', 'low', 'overpower');
  assert.equal(overpower.result.buckets.overpower, 1);
  assert.equal(overpower.input.overpowerPct, null);
  const overpowerLine = overpower.input.modifiers.find(mod => mod.name === 'Overpower Damage');
  assert.equal(overpowerLine.bucket, 'additive');
  assert.equal(overpowerLine.value, 6432.2);
  assert.equal(overpower.input.modifiers.some(mod => mod.name.startsWith('Earthstriker') && mod.value === 19.5), true);
  const town = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'] });
  assert.equal(town.input.overpowerPct, null);
  assert.equal(town.input.modifiers.some(mod => mod.name === 'Overpower Damage'), false);
  assert.equal(town.input.modifiers.some(mod => mod.name === 'vs Healthy or Injured' && mod.value === 26), true);
});

test('per-hit predictions under each crit reading', () => {
  const expected = {
    'combat-nobuff': {
      low: {
        normal: [16431932182.86, 3031721804.96, 5699636993.32, 3031721804.96],
        overpower: [34630527806.34, 6389396274.23, 12012064995.56, 6389396274.23]
      }
    },
    'combat-allbuff': {
      low: {
        normal: [44861481880.89, 8277026177.29, 15560809213.30, 8277026177.29],
        overpower: [88642766331.12, 16354753935.63, 30746937398.99, 16354753935.63]
      },
      high: {
        normal: [65688247920.56, 12119602937.37, 22784853522.26, 12119602937.37],
        overpower: [118508348832.01, 21865009009.60, 41106216938.04, 21865009009.60]
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
  near(healthyHigh.result.total, 145899170042.53);
  const four = score('combat-nobuff', 'low', 'normal', {}, 'headline');
  const atFour = evaluateBuild(catalog, { ...hit('combat-nobuff', 'normal'), souls: 4 }, { sheetContext: 'combat-nobuff' });
  const at27 = evaluateBuild(catalog, { ...hit('combat-nobuff', 'normal'), souls: 27 }, { sheetContext: 'combat-nobuff', soulModel: 'compound' });
  near(atFour.result.total, four.result.total * 1.164 / 1.615);
  near(at27.soulFactor, 1.041 ** 27);
  assert.equal(atFour.soulsEstimate, false);
  assert.match(atFour.input.notes.join('\n'), /\+4% damage taken/);
});

test('the splinter is a single 4.1% per soul effect', () => {
  const entity = catalog.seasonalMechanics.find(item => item.id === 'splinter-of-the-black-soulstone');
  const scored = entity.effects.filter(effect => effect.kind === 'damage' && effect.scored !== false && /per soul/i.test(effect.stat || ''));
  assert.equal(scored.length, 1);
  assert.equal(scored[0].value, 4.1);
  const helm = catalog.uniques.find(item => item.id === 'leorics-crown');
  assert.equal(helm.effects.filter(effect => /per soul/i.test(effect.stat || '') && effect.scored !== false && effect.kind === 'damage').length, 0);
  const town = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'] });
  const applied = town.input.modifiers.filter(mod => mod.id === 'splinter-of-the-black-soulstone' || (mod.id === 'leorics-crown' && mod.bucket === 'multiplicative'));
  assert.equal(applied.length, 1);
  assert.equal(applied[0].perSoul, 4.1);
  assert.match(town.input.notes.join('\n'), /2\.5%\[x\].*× Leoric gem effect \+65%\[x\] \(1\.65\)/);
  assert.match(town.input.notes.join('\n'), /not scored/);
  const at15 = 1 + 0.041 * 15;
  assert.ok(Math.abs(town.soulFactor - at15) < 1e-9);
  const compound = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'], souls: 27 }, { soulModel: 'compound' });
  assert.ok(Math.abs(compound.soulFactor - (1.041 ** 27)) < 1e-9);
  assert.equal(compound.input.modifiers.filter(mod => mod.perSoul != null).length, 1);
});

test('Overpower Damage is additive and the separate multiplier stays 1', () => {
  const normal = score('combat-nobuff', 'low', 'normal');
  const overpower = score('combat-nobuff', 'low', 'overpower');
  assert.equal(overpower.result.buckets.overpower, 1);
  assert.equal(normal.result.buckets.overpower, 1);
  assert.equal(overpower.input.overpowerPct, null);
  const line = overpower.input.modifiers.find(mod => mod.name === 'Overpower Damage');
  assert.equal(line.bucket, 'additive');
  assert.equal(line.sheetConditional, true);
  assert.equal(line.value, 6432.2);
  assert.ok(Math.abs((overpower.result.buckets.additive - normal.result.buckets.additive) - 6432.2 / 100) < 1e-9);
  assert.equal(normal.input.modifiers.some(mod => mod.name === 'Overpower Damage'), false);
  assert.equal(overpower.overpowerSheetMeaning, 'total');
  assert.equal(overpower.overpowerAlternate.meaning, 'perStack');
  assert.equal(overpower.overpowerAlternate.stacks, 4);
  assert.equal(overpower.overpowerAlternate.additive, 6432.2 * 4);
  const perStack = evaluateBuild(catalog, hit('combat-nobuff', 'overpower'), {
    sheetContext: 'combat-nobuff',
    overpowerSheetMeaning: 'perStack'
  });
  assert.equal(perStack.input.modifiers.find(mod => mod.name === 'Overpower Damage').value, 6432.2 * 4);
  assert.equal(perStack.result.buckets.overpower, 1);
  const town = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'] });
  assert.equal(town.input.overpowerPct, null);
  assert.equal(town.result.buckets.overpower, 1);
  assert.match(town.input.notes.join('\n'), /104% \(4 × 26\) is retired/);
});
