import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';
import { buildFromCore, collectGearCandidates, enumerateSkillCores, greedyAssign, marginalRank, optimize, searchGear } from '../src/search.js';
import { engineInputFromBuild } from '../src/catalog.js';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/synthetic-catalog.json', import.meta.url), 'utf8'));
const meta = JSON.parse(readFileSync(new URL('./fixtures/synthetic-meta.json', import.meta.url), 'utf8'));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const opts = {
  tags: ['Core'],
  weaponDmg: 100,
  mainStat: 0,
  critChance: 0,
  critDmg: 0,
  manualInputsVerified: true,
  powerFloor: 1,
  beamWidth: 4,
  metaBuilds: meta
};

test('skill cores are pruned by tags and capped by the skill bar', () => {
  const cores = enumerateSkillCores(catalog, { tags: ['Core'] });
  const ids = cores.map(core => core.map(skill => skill.id).join('+'));
  assert.ok(ids.includes('alpha'));
  assert.ok(ids.includes('alpha+beta'));
  assert.equal(ids.some(id => id.includes('gamma')), false);
  assert.equal(cores.some(core => core.length > 2), false);
});

test('greedy ranks by marginal bucket value and will not place null, slotless, or paragon items', () => {
  const alpha = buildFromCore(catalog, [catalog.skills.find(skill => skill.id === 'alpha')], opts);
  const input = engineInputFromBuild(catalog, alpha, opts);
  const candidates = collectGearCandidates(catalog, alpha, opts);
  const ranked = marginalRank(input, candidates);
  assert.equal(ranked[0].id, 'synth-helm-only');
  assert.ok(ranked[0].score > ranked.find(item => item.id === 'synth-mult').score);
  assert.equal(candidates.some(item => ['synth-null', 'synth-mystery', 'synth-paragon', 'synth-unverified'].includes(item.id)), false);
  const greedy = greedyAssign(catalog, alpha, opts);
  const chosen = greedy.chosen.map(item => item.id);
  assert.deepEqual(chosen, ['synth-helm-only', 'synth-mult', 'synth-add-40', 'synth-add-30', 'synth-ring']);
  const searched = searchGear(catalog, alpha, opts);
  assert.ok(searched.beamPower >= searched.greedyPower);
  near(searched.power, 612);
});

test('default ranking keeps fully verified builds only, ordered by power times novelty', () => {
  const out = optimize(catalog, opts);
  assert.equal(out.ranked[0].skills[0], 'alpha');
  assert.equal(out.ranked[0].unverifiedShare, 0);
  near(out.ranked[0].power, 612);
  near(out.ranked[0].score, out.ranked[0].power * out.ranked[0].novelty);
  assert.ok(out.ranked[0].novelty > out.ranked[1].novelty);
  assert.match(out.ranked[0].why, /Why:/);
  assert.equal(out.ranked.some(result => result.skills.includes('gamma') || result.skills.includes('delta')), false);
  assert.equal(out.ranked.some(result => result.gear.some(item => item.id === 'synth-unverified' || item.id === 'synth-ring-weak' || item.id === 'synth-paragon')), false);
  const loose = optimize(catalog, { ...opts, includeUnverified: true });
  assert.ok(loose.ranked[0].gear.some(item => item.id === 'synth-unverified'));
  assert.ok(loose.ranked[0].unverifiedShare > 0);
  assert.ok(loose.ranked[0].power > out.ranked[0].power);
});

test('partial vulnerable uptime blends the engine on and off states', () => {
  const build = buildFromCore(catalog, [catalog.skills.find(skill => skill.id === 'alpha')], {
    weaponDmg: 100, mainStat: 0, critChance: 0, critDmg: 0, vulnPct: 100, uptime: { vulnerable: 0.5 }
  });
  const evaluated = evaluateBuild(catalog, build);
  near(evaluated.result.total, 150);
});

test('real catalog does not rank an unverified build unless asked', () => {
  const real = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
  const realMeta = JSON.parse(readFileSync(new URL('../data/meta-builds.json', import.meta.url), 'utf8'));
  const hidden = optimize(real, {
    weaponDmg: 100, mainStat: 0, critChance: 0, critDmg: 0,
    manualInputsVerified: true, powerFloor: 1, maxSkills: 1, metaBuilds: realMeta
  });
  assert.equal(hidden.ranked.length, 0);
  const shown = optimize(real, {
    includeUnverified: true, weaponDmg: 100, mainStat: 0, critChance: 0, critDmg: 0,
    manualInputsVerified: true, powerFloor: 1, maxSkills: 1, metaBuilds: realMeta
  });
  assert.ok(shown.ranked.length > 0);
  assert.equal(shown.ranked[0].skills[0], 'death-blow');
  assert.equal(shown.ranked[0].power, 737);
  assert.equal(real.skills.find(skill => skill.id === 'cota-madawc').coeffPct, 120);
  assert.ok(shown.ranked.every(result => result.unverifiedShare > 0));
  assert.equal(shown.ranked.some(result => result.gear.some(item => item.kind === 'aspect' || item.kind === 'unique')), false);
});
