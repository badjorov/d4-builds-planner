import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
const saved = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));

function bare(skills, extra = {}) {
  return {
    skills,
    gear: [],
    weaponDmg: 100,
    mainStat: 0,
    critChance: 0,
    critDmg: 0,
    uptime: {},
    ...extra
  };
}

test('a damage over time skill is unchanged when crit chance or crit damage changes', () => {
  const quiet = evaluateBuild(catalog, bare(['challenging-shout']));
  const loud = evaluateBuild(catalog, bare(['challenging-shout'], { critChance: 100, critDmg: 7424.8 }));
  const withLine = evaluateBuild(catalog, bare(['challenging-shout'], { critChance: 100, critDmg: 7424.8 }), {
    extraModifiers: [{ name: 'crit line', bucket: 'crit-mult', value: 310, kind: 'affix' }]
  });
  assert.equal(quiet.input.isDot, true);
  assert.equal(loud.input.coeffPct, 2430);
  near(loud.result.total, quiet.result.total);
  near(withLine.result.total, quiet.result.total);
  assert.equal(loud.result.buckets.crit, 1);
  assert.equal(loud.input.modifiers.some(mod => mod.bucket === 'crit-mult'), false);
});

test('a mixed skill crits only its direct part', () => {
  const rend = catalog.skills.find(skill => skill.id === 'rend');
  assert.equal(rend.dot, true);
  assert.deepEqual(rend.components.map(part => [part.name, part.coeffPct, part.damageType]), [
    ['hit', 86, 'direct'],
    ['bleed', 184, 'dot']
  ]);
  const quiet = evaluateBuild(catalog, bare(['rend']));
  const loud = evaluateBuild(catalog, bare(['rend'], { critChance: 100, critDmg: 100 }));
  const withLine = evaluateBuild(catalog, bare(['rend'], { critChance: 100, critDmg: 100 }), {
    extraModifiers: [{ name: 'crit line', bucket: 'crit-mult', value: 100, kind: 'affix' }]
  });
  const bleed = result => result.terms.find(term => term.label === 'bleed').value;
  assert.equal(loud.input.isDot, false);
  assert.equal(loud.input.coeffPct, 86);
  assert.equal(loud.input.auras[0].isDot, true);
  near(quiet.result.total, 86 + 184);
  near(bleed(quiet.result), 184);
  near(bleed(loud.result), 184);
  near(bleed(withLine.result), 184);
  near(loud.result.total - quiet.result.total, 86);
  near(withLine.result.total - quiet.result.total, 86 * 3);
  near(loud.result.total, 86 * 2 + 184);
  near(withLine.result.total, 86 * 4 + 184);
});

test('an unset damage type leaves crit off and is flagged', () => {
  const mystery = {
    meta: { class: 'Barbarian' },
    skills: [{ id: 'mystery', name: 'Mystery', coeffPct: 100, dot: null, effects: [] }]
  };
  const evaluated = evaluateBuild(mystery, bare(['mystery'], { critChance: 100, critDmg: 500 }));
  near(evaluated.result.total, 100);
  assert.equal(evaluated.input.isDot, true);
  assert.equal(evaluated.input.notes.some(note => note.includes('damage type is unset')), true);
});

test('the whirlwind headline stays on the direct hit', () => {
  const build = saved.builds.find(entry => entry.id === 'users-current-build');
  const whirlwind = evaluateBuild(catalog, { ...build, skills: ['whirlwind'] });
  const dust = catalog.skills.find(skill => skill.id === 'whirlwind').effects.find(effect => effect.stat === 'Dust Devils');
  assert.equal(dust.damageType, null);
  assert.equal(whirlwind.input.isDot, false);
  assert.equal(whirlwind.input.coeffPct, 386);
  assert.ok(Math.abs(whirlwind.result.total - 56001684701.70) < 0.01, String(whirlwind.result.total));
  assert.equal(whirlwind.input.notes.some(note => note.includes('Dust Devils') && note.includes('no damage type')), true);
});
