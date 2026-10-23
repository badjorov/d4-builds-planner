import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';
import { compareGuide, renderGuideComparison } from '../src/compare-guide.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = read('../data/barbarian.json');
const saved = read('../data/builds.json');
const meta = read('../data/meta-builds.json');
const build = saved.builds.find(entry => entry.id === 'users-current-build');

test('calibrated defaults stay locked and the alternates still switch', () => {
  assert.equal(build.soulModel, 'sum');
  assert.equal(build.overpowerSheetMeaning, 'total');
  assert.equal(build.critAudit.reading, 'headline');
  const sum = evaluateBuild(catalog, { ...build, skills: ['whirlwind'], souls: 30 });
  assert.equal(sum.soulModel, 'sum');
  assert.ok(Math.abs(sum.soulFactor - (1 + 0.041 * 30)) < 1e-9);
  assert.equal(sum.overpowerSheetMeaning, 'total');
  assert.equal(sum.critReading, 'headline');
  assert.equal(sum.soulAlternate.model, 'compound');
  const overpower = evaluateBuild(catalog, {
    ...build,
    skills: ['whirlwind'],
    souls: 30,
    uptime: { ...build.uptime, overpower: 1 }
  }, { sheetContext: 'combat-allbuff' });
  assert.equal(overpower.overpowerSheetMeaning, 'total');
  assert.equal(overpower.overpowerAlternate.meaning, 'perStack');
  assert.equal(overpower.input.modifiers.find(mod => mod.name === 'Overpower Damage').value, 6432.2);
  const compound = evaluateBuild(catalog, { ...build, skills: ['whirlwind'], souls: 30 }, { soulModel: 'compound' });
  assert.equal(compound.soulModel, 'compound');
  assert.ok(Math.abs(compound.soulFactor - (1.041 ** 30)) < 1e-6);
  assert.equal(compound.soulAlternate, null);
  const perStack = evaluateBuild(catalog, {
    ...build,
    skills: ['whirlwind'],
    souls: 30,
    uptime: { ...build.uptime, overpower: 1 }
  }, { overpowerSheetMeaning: 'perStack', sheetContext: 'combat-allbuff' });
  assert.equal(perStack.overpowerSheetMeaning, 'perStack');
  assert.equal(perStack.overpowerAlternate, null);
  assert.equal(perStack.input.modifiers.find(mod => mod.name === 'Overpower Damage').value, 6432.2 * 4);
  const other = evaluateBuild(catalog, {
    ...build,
    skills: ['whirlwind'],
    critAudit: { ...build.critAudit, reading: 'sheet-includes-gear-x' }
  });
  assert.equal(other.critReading, 'sheet-includes-gear-x');
});

test('the guide variant 4 comparison runs on the calibrated timeline', () => {
  const report = compareGuide(catalog, saved, meta);
  assert.equal(report.source, 'https://d4builds.gg/builds/whirlwind-barbarian-endgame/?var=4');
  assert.equal(report.guideId, 'ww-d4builds-immortal-speed-130');
  assert.deepEqual(report.defaults, { soulModel: 'sum', overpowerSheetMeaning: 'total', critReading: 'headline' });
  assert.equal(report.skillsSame, true);
  assert.equal(report.runesSame, true);
  assert.equal(report.expertiseSame, true);
  assert.equal(report.paragon.same, true);
  const nikolay30 = report.nikolay.rows.find(row => row.souls === 30);
  const guide30 = report.guideScores.rows.find(row => row.souls === 30);
  const nikolay15 = report.nikolay.rows.find(row => row.souls === 15);
  const guide15 = report.guideScores.rows.find(row => row.souls === 15);
  assert.ok(Math.abs(nikolay30.peakTotal - 784106611537.7529) < 1);
  assert.ok(Math.abs(nikolay30.averageTotal - 341462936901.1439) < 1);
  assert.ok(guide30.peakTotal < nikolay30.peakTotal);
  assert.ok(guide30.averageTotal < nikolay30.averageTotal);
  assert.ok(guide15.peakTotal < nikolay15.peakTotal);
  const starless = report.slots.find(slot => /starless/i.test(slot.guideName));
  assert.equal(starless.catalogId, null);
  assert.equal(starless.invented, false);
  assert.equal(starless.same, false);
  const helm = report.slots.find(slot => slot.slotId === 'helm');
  assert.equal(helm.swapMultiplierPeak, 1);
  const unchanged = report.slots.filter(slot => slot.same);
  assert.ok(unchanged.length >= 10);
  assert.ok(unchanged.every(slot => slot.swapMultiplierPeak === 1));
  assert.ok(report.missing.some(item => item.name === 'Ring of Starless Skies'));
  assert.ok(report.missing.some(item => item.name === 'Blood-Mad Idol'));
  assert.ok(report.missing.some(item => item.name === 'The Furnace'));
  assert.ok(report.beats.some(item => item.name === 'Stone of Jordan'));
  assert.equal(report.beats.some(item => item.name === 'Leoric\'s Crown'), false);
  assert.match(report.assumptions.join('\n'), /Assumption/);
  assert.match(report.assumptions.join('\n'), /No roll is invented/);
  const doc = readFileSync(new URL('../docs/compare-guide-v4.md', import.meta.url), 'utf8');
  assert.equal(doc, renderGuideComparison(report));
  assert.match(doc, /718B/);
  assert.match(doc, /Stone of Jordan/);
  assert.match(doc, /meta-builds.json/);
});
