import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateBuild } from '../src/catalog.js';

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('a wrath aura adds the hit for its uptime and the burn skips crit', () => {
  const catalog = {
    meta: { class: 'Barbarian' },
    mainstat: { verified: true, percentPer10: 0 },
    skills: [{
      id: 'wrath',
      name: 'Wrath of the Berserker',
      coeffPct: 0,
      dot: false,
      aura: {
        coeffPct: 560,
        dot: false,
        burnCoeffPct: 56,
        burnDot: true,
        uptime: 0.5,
        estimate: true
      }
    }],
    aspects: [],
    uniques: []
  };
  const build = {
    skills: ['wrath'],
    gear: [],
    weaponDmg: 100,
    mainStat: 0,
    critChance: 100,
    critDmg: 100,
    vulnPct: 0,
    overpowerPct: 0,
    uptime: { berserk: null, vulnerable: null, overpower: null }
  };
  const evaluated = evaluateBuild(catalog, build);
  near(evaluated.result.total, 840 + 28);
  assert.equal(evaluated.input.notes.some(note => note.includes('estimate')), true);
});

test('the saved wrath aura and overpower stacks use the tooltip durations', () => {
  const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
  const saved = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8'));
  const build = saved.builds.find(entry => entry.id === 'users-current-build');
  const wrath = catalog.skills.find(skill => skill.id === 'wrath-of-the-berserker');
  assert.equal(wrath.coeffPct, 0);
  assert.equal(wrath.dot, false);
  assert.equal(wrath.aura.coeffPct, 560);
  assert.equal(wrath.aura.dot, false);
  assert.equal(wrath.aura.burnCoeffPct, 56);
  assert.equal(wrath.aura.burnDot, true);
  assert.equal(wrath.aura.burnDuration, 5);
  assert.equal(wrath.aura.uptime, 0.290869);
  assert.equal(wrath.aura.estimate, true);
  assert.equal(build.overpowerPct, 104);
  assert.equal(build.overpowerStacks.perStack, 26);
  assert.equal(build.overpowerStacks.activeStacks, 4);
  assert.equal(build.overpowerStacks.lingerSeconds, 4);
  assert.equal(build.overpowerStacks.estimate, true);
  assert.equal(build.uptime.overpower, 0.364507);
  assert.equal(build.uptime.vulnerable, 0.662691);
  assert.equal(build.uptime.estimate.overpower, true);
  assert.equal(build.uptime.estimate.vulnerable, true);
  const earth = catalog.aspects.find(aspect => aspect.id === 'earthstrikers-aspect');
  assert.equal(earth.effects.find(effect => effect.stat === 'Overpower damage per stack').bucket, 'overpower');
});
