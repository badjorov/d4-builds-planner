import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from '../src/schema.js';
import { blankBuild } from '../src/catalog.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const catalog = read('../data/barbarian.json');
const fixture = read('./fixtures/synthetic-catalog.json');
const meta = read('../data/meta-builds.json');
const catalogSchema = read('../data/schema/catalog.schema.json');
const buildSchema = read('../data/schema/build.schema.json');
const metaSchema = read('../data/schema/meta-builds.schema.json');

test('migrated barbarian catalog matches the schema', () => {
  const result = validate(catalogSchema, catalog);
  assert.equal(result.ok, true, JSON.stringify(result.errors.slice(0, 5)));
});

test('synthetic fixture and meta builds match their schemas', () => {
  assert.equal(validate(catalogSchema, fixture).ok, true);
  assert.equal(fixture.meta.synthetic, true);
  assert.equal(validate(metaSchema, meta).ok, true);
  assert.equal(meta.builds.length, 1);
  assert.equal(meta.builds[0].example, false);
  assert.equal(meta.builds[0].verified, false);
  assert.equal(meta.builds[0].id, 'ww-d4builds-immortal-speed-130');
  assert.deepEqual(Object.values(meta.builds[0].bucketProfile), [null, null, null, null, null, null]);
  const saved = read('../data/builds.json');
  assert.equal(saved.builds[0].name, "user's current build");
  assert.equal(saved.builds[0].verified, false);
  assert.equal(validate(buildSchema, saved.builds[0]).ok, true);
  assert.equal(meta.builds.some(build => build.name === "user's current build"), false);
});

test('a blank 13-slot build matches the build schema', () => {
  const build = blankBuild(catalog, { id: 'draft', name: 'Draft', skills: ['hota'] });
  const result = validate(buildSchema, build);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(build.gear.length, 13);
});

test('schema rejects a missing source, an unknown field, and a 12-slot build', () => {
  const missing = structuredClone(catalog);
  delete missing.skills[0].source;
  assert.equal(validate(catalogSchema, missing).ok, false);
  const extra = structuredClone(catalog);
  extra.skills[0].inventedNumber = 123;
  assert.equal(validate(catalogSchema, extra).ok, false);
  const build = blankBuild(catalog, { id: 'short', name: 'Short' });
  build.gear.pop();
  assert.equal(validate(buildSchema, build).ok, false);
});

test('migration keeps sourced numbers and stores transcribed coefficients unverified', () => {
  const coeff = Object.fromEntries(catalog.skills.map(skill => [skill.id, skill.coeffPct]));
  assert.equal(coeff.hota, 170);
  assert.equal(coeff.whirlwind, 18);
  assert.equal(coeff.rend, 86);
  assert.equal(coeff['rallying-cry-madawc'], 100);
  assert.equal(coeff['cota-madawc'], 120);
  assert.equal(coeff.charge, 652);
  assert.equal(coeff.kick, 148);
  const hota = catalog.skills.find(skill => skill.id === 'hota');
  assert.equal(hota.verified, false);
  assert.equal(hota.transcriptionId, 'hammer-of-the-ancients');
  assert.equal(hota.effects[0].verified, false);
  const whirlwind = catalog.skills.find(skill => skill.id === 'whirlwind');
  assert.equal(whirlwind.suspect, true);
  assert.deepEqual(whirlwind.tags, ['Core', 'Channeled']);
  assert.equal(catalog.skills.find(skill => skill.id === 'rend').dot, true);
  assert.equal(catalog.skills.find(skill => skill.id === 'lunging-strike').nextRank.coeffPct, 123);
  assert.equal(catalog.mainstat.percentPer10, 0.8);
  assert.equal(catalog.mainstat.verified, true);
  const writhing = catalog.aspects.find(aspect => aspect.id === 'writhing');
  assert.deepEqual(writhing.effects[0].value, [6, 9]);
  assert.equal(writhing.slots, null);
  for (const aspect of catalog.aspects) {
    if (aspect.id === 'aspect-of-coagulation') continue;
    for (const effect of aspect.effects) assert.equal(typeof effect.value === 'number', false);
  }
  const coagulation = catalog.aspects.find(aspect => aspect.id === 'aspect-of-coagulation');
  assert.equal(coagulation.verified, false);
  assert.equal(coagulation.slots, null);
  assert.equal(coagulation.rank, '5/16');
  assert.equal(coagulation.effects[0].value, 20);
  assert.deepEqual(coagulation.effects[0].range, [20, 30]);
  assert.equal(coagulation.effects[1].value, 1.9);
  assert.deepEqual(coagulation.effects[1].conditions, ['while Fortified']);
  const furor = catalog.uniques.find(unique => unique.id === 'red-furor');
  assert.equal(furor.effects[0].value, null);
  assert.equal(furor.slots, null);
  assert.equal(catalog.paragonNodes.find(node => node.id === 'hemorrhage').effects[0].value, 60);
  const disembowel = catalog.glyphs.find(glyph => glyph.id === 'disembowel');
  assert.equal(disembowel.effects[0].value, 15);
  assert.equal(disembowel.effects[0].verified, true);
  assert.equal(disembowel.verified, false);
  assert.equal(disembowel.legendary, '+5.5%[x]');
  const guardian = catalog.affixes.find(affix => affix.id === 'guardian-finesse');
  assert.equal(guardian.suspect, true);
  assert.deepEqual(guardian.effects, []);
  const legacy = catalog.affixes.find(affix => affix.id === 'barbarian-protection-legacy');
  assert.equal(legacy.effects[0].value, null);
  assert.equal(legacy.effects[0].count, 4);
  assert.equal(catalog.affixes.filter(affix => affix.sourceId === 'paladin-perseverance').length, 2);
  assert.equal(catalog.skills.some(skill => skill.verified === true && skill.source === 'user video 2026-10-21 batch2 (transcribed)'), false);
  assert.deepEqual(catalog.skillVariants, []);
  assert.deepEqual(catalog.talismans, []);
  assert.equal(catalog.constraints.skillBarSize, null);
  assert.equal(catalog.constraints.gearSlots.length, 13);
  assert.equal(catalog.constraints.gearSlots[12].name, null);
});
