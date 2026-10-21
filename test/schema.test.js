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
  assert.equal(meta.builds[0].example, true);
  assert.match(meta.builds[0].name, /EXAMPLE/);
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

test('migration keeps sourced numbers and leaves unknown coefficients null', () => {
  const coeff = Object.fromEntries(catalog.skills.map(skill => [skill.id, skill.coeffPct]));
  assert.equal(coeff.hota, null);
  assert.equal(coeff.whirlwind, null);
  assert.equal(coeff.rend, null);
  assert.equal(coeff['rallying-cry-madawc'], 100);
  assert.equal(coeff['cota-madawc'], 120);
  assert.equal(coeff.charge, null);
  assert.equal(coeff.kick, null);
  assert.equal(catalog.mainstat.percentPer10, 0.8);
  assert.equal(catalog.mainstat.verified, true);
  assert.equal(catalog.skills.find(skill => skill.id === 'rend').dot, true);
  const writhing = catalog.aspects.find(aspect => aspect.id === 'writhing');
  assert.deepEqual(writhing.effects[0].value, [6, 9]);
  assert.equal(writhing.slots, null);
  for (const aspect of catalog.aspects) {
    for (const effect of aspect.effects) assert.equal(typeof effect.value === 'number', false);
  }
  const furor = catalog.uniques.find(unique => unique.id === 'red-furor');
  assert.equal(furor.effects[0].value, null);
  assert.equal(furor.slots, null);
  assert.equal(catalog.paragonNodes.find(node => node.id === 'hemorrhage').effects[0].value, 60);
  assert.equal(catalog.glyphs.find(glyph => glyph.id === 'disembowel').effects[0].value, 15);
  assert.deepEqual(catalog.skillVariants, []);
  assert.deepEqual(catalog.affixes, []);
  assert.deepEqual(catalog.talismans, []);
  assert.equal(catalog.constraints.skillBarSize, null);
  assert.equal(catalog.constraints.gearSlots.length, 13);
  assert.equal(catalog.constraints.gearSlots[12].name, null);
});
