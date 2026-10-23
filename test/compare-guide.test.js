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
  assert.equal(report.uniqueSource, 'd4-guide-uniques.md');
  assert.equal(report.guideId, 'ww-d4builds-immortal-speed-130');
  assert.deepEqual(report.defaults, { soulModel: 'sum', overpowerSheetMeaning: 'total', critReading: 'headline' });
  assert.equal(report.skillsSame, true);
  assert.equal(report.runesSame, true);
  assert.equal(report.expertiseSame, true);
  assert.equal(report.paragon.same, true);
  assert.equal(report.soulRates.nikolay, 4.1);
  assert.equal(report.soulRates.guide, 2.5);
  assert.equal(report.extraCdrPct, 10);
  assert.equal(report.eliteShare, 0.75);
  const nikolay30 = report.nikolay.rows.find(row => row.souls === 30);
  const nikolay15 = report.nikolay.rows.find(row => row.souls === 15);
  assert.ok(Math.abs(nikolay30.peakTotal - 784106611537.7529) < 1);
  assert.ok(Math.abs(nikolay30.averageTotal - 341462936901.1439) < 1);
  assert.ok(nikolay15.peakTotal < nikolay30.peakTotal);
  const guide30 = Object.fromEntries(Object.entries(report.guideScores.variants).map(([key, rows]) => [key, rows.find(row => row.souls === 30)]));
  assert.ok(guide30.min.peakTotal < guide30.max.peakTotal);
  assert.ok(guide30['additive-min'].peakTotal < guide30.min.peakTotal);
  assert.ok(guide30['additive-max'].peakTotal < guide30.max.peakTotal);
  assert.ok(guide30.min.averageTotal < guide30.max.averageTotal);
  const starless = report.slots.find(slot => /starless/i.test(slot.guideName));
  assert.equal(starless.catalogId, 'ring-of-starless-skies');
  assert.equal(starless.invented, false);
  assert.equal(starless.same, false);
  assert.ok(Math.abs(starless.multipliers.min.peak - (1.1 / 1.23)) < 1e-9);
  assert.ok(Math.abs(starless.multipliers.max.peak - (1.5 / 1.23)) < 1e-9);
  assert.ok(Math.abs(starless.multipliers.min.average - starless.multipliers.min.peak) < 1e-9);
  const helm = report.slots.find(slot => slot.slotId === 'helm');
  assert.equal(helm.catalogId, 'tuskhelm-of-joritz-the-mighty-unique');
  const soulRatio = (1 + 0.025 * 30) / (1 + 0.041 * 30);
  assert.ok(Math.abs(helm.multipliers.min.peak - soulRatio * 1.4) < 1e-6);
  assert.ok(Math.abs(helm.multipliers.max.peak - soulRatio * 1.5) < 1e-6);
  assert.ok(helm.multipliers.additiveMin.peak < 1);
  const unchanged = report.slots.filter(slot => slot.same);
  assert.ok(unchanged.length >= 10);
  assert.ok(unchanged.every(slot => slot.multipliers.min.peak === 1 && slot.multipliers.max.average === 1));
  const furnace = report.charms.find(slot => slot.catalogId === 'the-furnace');
  assert.equal(furnace.replacesWeapon, false);
  assert.deepEqual(furnace.catalogSlots, ['weapon-2']);
  assert.ok(Math.abs(furnace.multipliers.min.peak - 1.75) < 1e-9);
  assert.ok(Math.abs(furnace.multipliers.max.peak - 3) < 1e-9);
  assert.ok(Math.abs(furnace.multipliers.min.average - 1.5625) < 1e-9);
  assert.ok(Math.abs(furnace.multipliers.max.average - 2.5) < 1e-9);
  const idol = report.charms.find(slot => slot.catalogId === 'blood-mad-idol');
  assert.ok(Math.abs(idol.multipliers.min.peak - 1.75) < 1e-9);
  assert.ok(Math.abs(idol.multipliers.max.peak - 2.5) < 1e-9);
  assert.ok(idol.multipliers.additiveMax.peak < 1.01);
  assert.equal(report.slots.find(slot => slot.slotId === 'weapon-2').multipliers.max.peak, 1);
  assert.ok(report.missing.some(item => item.name === 'Ring of Starless Skies'));
  assert.ok(report.missing.some(item => item.name === 'Blood-Mad Idol'));
  assert.ok(report.missing.some(item => item.name === 'The Furnace'));
  assert.ok(report.missing.some(item => item.name === 'Tuskhelm of Joritz the Mighty'));
  assert.match(report.assumptions.join('\n'), /Assumption/);
  assert.match(report.assumptions.join('\n'), /No roll is invented/);
  const doc = readFileSync(new URL('../docs/compare-guide-v4.md', import.meta.url), 'utf8');
  assert.equal(doc, renderGuideComparison(report));
  assert.match(doc, /718B/);
  assert.match(doc, /Stone of Jordan/);
  assert.match(doc, /meta-builds.json/);
  assert.match(doc, /2\.5%/);
  assert.match(doc, /d4-guide-uniques\.md/);
});

test('the four guide uniques stay estimates and Leoric keeps the screenshot gem boost', () => {
  const starless = catalog.uniques.find(item => item.id === 'ring-of-starless-skies');
  const tuskhelm = catalog.uniques.find(item => item.id === 'tuskhelm-of-joritz-the-mighty-unique');
  const idol = catalog.uniques.find(item => item.id === 'blood-mad-idol');
  const furnace = catalog.uniques.find(item => item.id === 'the-furnace');
  for (const unique of [starless, tuskhelm, idol, furnace]) {
    assert.equal(unique.verified, false);
    assert.equal(unique.source, 'd4-guide-uniques.md');
    assert.match(unique.note, /Estimate/);
    assert.match(unique.note, /3\.2\.3/);
  }
  assert.equal(starless.effects.find(effect => effect.kind === 'resource').value, null);
  assert.deepEqual(starless.effects.find(effect => effect.kind === 'damage').range, [10, 50]);
  assert.deepEqual(tuskhelm.effects.find(effect => effect.kind === 'damage').range, [40, 50]);
  assert.equal(tuskhelm.effects.find(effect => /Cooldown Reduction/.test(effect.stat)).value, 10);
  assert.equal(tuskhelm.slots[0], 'helm');
  assert.deepEqual(idol.effects.find(effect => effect.kind === 'damage').range, [75, 150]);
  assert.equal(idol.effects.find(effect => effect.kind === 'defense').value, 200);
  assert.equal(idol.slots, null);
  assert.deepEqual(furnace.effects[0].range, [75, 200]);
  assert.deepEqual(furnace.slots, ['weapon-2']);
  const leoric = catalog.uniques.find(item => item.id === 'leorics-crown');
  const gem = leoric.effects.find(effect => effect.stat === 'gem effect');
  assert.equal(gem.value, 65);
  assert.match(gem.note, /35-50/);
  assert.match(gem.note, /\+65%/);
  const splinter = catalog.seasonalMechanics.find(item => item.id === 'splinter-of-the-black-soulstone');
  const boosted = splinter.effects.find(effect => effect.scored !== false && effect.kind === 'damage');
  const base = splinter.effects.find(effect => /unboosted/.test(effect.stat));
  assert.equal(boosted.value, 4.1);
  assert.equal(base.value, 2.5);
  assert.equal(base.scored, false);
  const charm = catalog.talismans.find(item => item.id === 'tuskhelm-of-joritz-the-mighty');
  assert.equal(charm.effects.find(effect => effect.stat === 'damage').value, 15);
});
