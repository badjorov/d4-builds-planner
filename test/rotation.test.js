import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';
import { rotationReport, simulateBuffRotation } from '../src/rotation.js';

const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const builds = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));
const saved = builds.builds.find(build => build.id === 'users-current-build');

function near(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} vs ${expected}`);
}

test('a duration or a cooldown that is not stored stays off the timeline', () => {
  const report = rotationReport(catalog, saved);
  const rally = report.buffs.find(buff => buff.id === 'rallying-cry');
  const iron = report.buffs.find(buff => buff.id === 'iron-skin');
  assert.equal(rally.simulated, false);
  assert.equal(rally.cooldown, null);
  assert.equal(rally.duration, 4);
  assert.equal(rally.estimate, true);
  assert.match(rally.flags.join('\n'), /cooldown is not stored/);
  assert.equal(iron.simulated, false);
  assert.equal(iron.duration, null);
  assert.equal(iron.cooldown, 8.45);
  assert.match(iron.flags.join('\n'), /duration is not stored/);
  assert.equal(report.rotation.buffs.some(buff => buff.id === 'rallying-cry' || buff.id === 'iron-skin'), false);
  assert.equal(report.buffs.every(buff => buff.estimate === true), true);
  assert.equal(report.estimate, true);
});

test('the 60s timeline casts stored buffs on cooldown and uses sheet cooldown reduction', () => {
  const report = rotationReport(catalog, saved);
  assert.equal(report.horizon, 60);
  assert.equal(report.cdr.pct, 39.4);
  assert.equal(report.cdr.applied, true);
  assert.equal(report.shoutCut.seconds, 2);
  assert.equal(report.shoutCut.applied, true);
  assert.equal(report.overpowerLinger, 4);
  assert.equal(report.afterglow.seconds, 5);
  const war = report.rotation.buffs.find(buff => buff.id === 'war-cry');
  const shout = report.rotation.buffs.find(buff => buff.id === 'challenging-shout');
  const wrath = report.rotation.buffs.find(buff => buff.id === 'wrath-of-the-berserker');
  near(war.effectiveCooldown, 15.09 * (1 - 0.394), 1e-6);
  near(shout.effectiveCooldown, 15.09 * (1 - 0.394), 1e-6);
  near(wrath.effectiveCooldown, 54.32 * (1 - 0.394), 1e-6);
  assert.equal(war.casts.length, 7);
  assert.equal(shout.casts.length, 7);
  assert.equal(wrath.casts.length, 3);
  near(report.rotation.uptime['war-cry'], 28 / 60, 1e-9);
  near(report.rotation.uptime['challenging-shout'], 0.885546, 1e-6);
  near(report.rotation.uptime['wrath-of-the-berserker'], 0.7646216666666666, 1e-9);
  near(report.rotation.overpowerUptime, 0.897955, 1e-6);
  near(report.fullOverlap.seconds, 21.51092, 1e-4);
  near(report.fullOverlap.fraction, 21.51092 / 60, 1e-5);
  const fraction = report.rotation.combinations.reduce((sum, row) => sum + row.fraction, 0);
  near(fraction, 1, 1e-9);
  assert.match(report.notes.join('\n'), /estimate/);
});

test('synthetic overlap follows the cast times', () => {
  const single = simulateBuffRotation([
    { id: 'a', name: 'A', duration: 4, cooldown: 10, isShout: false, simulated: true, lines: [] }
  ], { horizon: 20, cdrPct: null, shoutCutSeconds: 0, overpowerLinger: null, unstoppableAfter: null });
  near(single.uptime.a, 0.4, 1e-9);
  assert.deepEqual(single.buffs[0].casts, [0, 10]);

  const pair = simulateBuffRotation([
    { id: 'a', name: 'A', duration: 4, cooldown: 10, isShout: false, simulated: true, lines: [] },
    { id: 'b', name: 'B', duration: 2, cooldown: 10, isShout: false, simulated: true, lines: [] }
  ], { horizon: 10, cdrPct: null, shoutCutSeconds: 0, overpowerLinger: null, unstoppableAfter: null });
  const both = pair.combinations.find(row => row.ids.join('+') === 'a+b');
  const onlyA = pair.combinations.find(row => row.ids.join('+') === 'a');
  near(both.seconds, 2, 1e-9);
  near(onlyA.seconds, 2, 1e-9);

  const cut = simulateBuffRotation([
    { id: 'war-cry', name: 'War Cry', duration: 1, cooldown: 10, isShout: true, simulated: true, lines: [] },
    { id: 'wrath-of-the-berserker', name: 'Wrath', duration: 4, cooldown: 20, isShout: false, simulated: true, lines: [] }
  ], { horizon: 20, cdrPct: null, shoutCutSeconds: 2, overpowerLinger: 4, unstoppableAfter: null });
  assert.deepEqual(cut.buffs.find(buff => buff.id === 'wrath-of-the-berserker').casts, [0, 16]);
  near(cut.uptime['wrath-of-the-berserker'], 0.4, 1e-9);
});

test('the 30-soul peak is reported against 718B and the model stays solo', () => {
  const report = rotationReport(catalog, saved);
  assert.equal(report.partyModeled, false);
  assert.equal(report.party.modeled, false);
  assert.deepEqual(report.party.names, ['Subo', 'Varyana']);
  assert.match(report.unexplained.join('\n'), /Party buffs from Subo and Varyana/);
  assert.match(report.unexplained.join('\n'), /not modeled/);
  assert.equal(report.peak.targetBillions, 718);
  assert.equal(report.peak.reading, 'headline');
  near(report.peak.total, 784106611537.75);
  near(report.peak.perStack, 1263891482264.07);
  near(report.average.total, 341462936901.14);
  near(report.average.perStack, 622182438283.20);
  near(report.peakWithoutAssumed, 653422176281.46);
  assert.equal(report.peakScore.overpowerBucket, 1);
  assert.equal(report.peakScore.overpowerPct, null);
  assert.equal(report.peakScore.overpowerAdditive, 6432.2);
  assert.deepEqual(report.peakScore.modifiers.map(mod => mod.value).sort((a, b) => a - b), [20, 30, 38.5]);
  const row = report.soulsTable.find(item => item.souls === 30 && item.model === 'sum');
  near(row.peakTotal, report.peak.total);
  const at15 = report.soulsTable.find(item => item.souls === 15 && item.model === 'sum');
  near(at15.peakTotal, report.peak.total * (1 + 0.041 * 15) / (1 + 0.041 * 30), 1);
  const at200 = report.soulsTable.find(item => item.souls === 200 && item.model === 'compound');
  near(at200.factor, 1.041 ** 200, 1e-6);
  assert.equal(report.soulsTable.length, 6);
  assert.equal(report.peak.total > report.average.total, true);
});

test('souls above the stored 200 cap score at 200', () => {
  const capped = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'], souls: 250 });
  assert.equal(capped.souls, 200);
  assert.equal(capped.soulsCapped, true);
  assert.equal(capped.soulCap, 200);
  near(capped.soulFactor, 1 + 0.041 * 200, 1e-9);
  assert.match(capped.input.notes.join('\n'), /above the stored cap of 200/);
  const at200 = evaluateBuild(catalog, { ...saved, skills: ['whirlwind'], souls: 200 });
  assert.equal(at200.soulsCapped, false);
  assert.equal(at200.souls, 200);
});
