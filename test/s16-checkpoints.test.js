import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cdrNeeded, shoutTable, averageAtAttackSpeed, wrathUptime, critStepValue } from '../src/s16-checkpoints.js';
import { blendWrathUptime, proposedFuryBalance, proposedWrathBlend, scoreProposedDoubleSwing } from '../src/s16-score.js';

test('shout cooldown math uses the file durations', () => {
  assert.ok(Math.abs(cdrNeeded(16, 90) - (1 - 16 / 90)) < 1e-12);
  assert.equal(cdrNeeded(4, 0), null);
  const wrath = shoutTable(0.09).find(row => row.id === 'wrath');
  assert.ok(wrath.cdrNeeded > 0.8);
  assert.ok(wrath.uptimeAtSheet < 0.25);
  const planned = wrathUptime(0.09, 2);
  assert.ok(planned.uptime > wrath.uptimeAtSheet);
  assert.ok(planned.uptime < 0.3);
});

test('the sustained baseline scales linearly up to the cap', () => {
  const atSheet = 1591.33e9;
  const atCap = averageAtAttackSpeed(atSheet, 120);
  assert.ok(Math.abs(atCap / atSheet - (2.42 / 1.2375)) < 1e-9);
  const balance = proposedFuryBalance(1.1 * 1.125);
  assert.equal(balance.maxFury, 605);
  assert.ok(balance.net < 0);
  assert.ok(balance.secondsToEmpty > 11 && balance.secondsToEmpty < 12);
  const catalog = JSON.parse(readFileSync(new URL('../data/barbarian.json', import.meta.url), 'utf8'));
  const build = JSON.parse(readFileSync(new URL('../data/builds.json', import.meta.url), 'utf8')).builds.find(item => item.id === 'users-current-build');
  const proposed = scoreProposedDoubleSwing(catalog, build, { amulet: 'crushing', rings: 'edgemaster' });
  assert.ok(proposed.ptrCoeff > 7000);
  const step = critStepValue(proposed.dpsAtSheet.max.average, 8211.3, 10396.6);
  assert.ok(Math.abs(step.fraction - 0.0556) < 0.001);
  const doc = readFileSync(new URL('../docs/s16-builds.md', import.meta.url), 'utf8');
  assert.match(doc, /Checkpoints/);
  assert.match(doc, /Fury Regeneration 12/);
  assert.match(doc, /1,742\.31B/);
  const wrath = proposedWrathBlend(catalog, build);
  assert.equal(wrath.headlineAssumesFullWrath, false);
  assert.ok(wrath.headlineUptime > 0.5 && wrath.headlineUptime < 0.6);
  const rebuilt = blendWrathUptime(wrath.headlineOn, wrath.headlineOff, wrath.headlineUptime);
  assert.ok(Math.abs(rebuilt - wrath.headline) < 1e6);
  assert.equal(wrath.table[0].average, wrath.window);
  assert.ok(Math.abs(wrath.gap - 68.25) < 1e-9);
  assert.ok(Math.abs(wrath.realistic - blendWrathUptime(wrath.window, wrath.outside, wrath.uptime)) < 1);
  assert.ok(wrath.outside > 600e9);
  assert.ok(wrath.realistic < wrath.headline);
  assert.match(doc, /1,120\.03B/);
});
