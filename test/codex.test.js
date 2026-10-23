import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codexUpgradeMatches, codexUpgradeValue, codexUpgradeValueFromRange } from '../src/codex.js';

test('codex upgrade values interpolate linearly from rank 1 to the cap', () => {
  assert.equal(codexUpgradeValue(30, 50, 21, 21), 50);
  assert.equal(codexUpgradeValue(15, 20, 9, 11), 19);
  assert.equal(codexUpgradeMatches(50, codexUpgradeValue(30, 50, 21, 21)), true);
  assert.equal(codexUpgradeMatches(19, codexUpgradeValue(15, 20, 9, 11)), true);
  assert.equal(codexUpgradeMatches(20, codexUpgradeValue(20, 30, 5, 16)), false);
  assert.equal(codexUpgradeMatches(1.9, codexUpgradeValue(1.5, 2, 5, 16)), false);
});

test('a high-to-low codex range decreases from the left endpoint to the right', () => {
  assert.equal(codexUpgradeValueFromRange([3.5, 1.5], 21, 21), 1.5);
  assert.equal(codexUpgradeValueFromRange([10, 4], 12, 13), 4.5);
  assert.equal(codexUpgradeValueFromRange([10, 4], 1, 13), 10);
  assert.equal(codexUpgradeValue(4, 10, 12, 13), 9.5);
  assert.equal(codexUpgradeMatches(4.5, codexUpgradeValueFromRange([10, 4], 12, 13)), true);
  assert.equal(codexUpgradeMatches(4.5, codexUpgradeValueFromRange([4, 10], 12, 13)), false);
});
