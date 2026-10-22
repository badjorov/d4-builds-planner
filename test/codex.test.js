import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codexUpgradeMatches, codexUpgradeValue } from '../src/codex.js';

test('codex upgrade values interpolate linearly from rank 1 to the cap', () => {
  assert.equal(codexUpgradeValue(30, 50, 21, 21), 50);
  assert.equal(codexUpgradeValue(15, 20, 9, 11), 19);
  assert.equal(codexUpgradeMatches(50, codexUpgradeValue(30, 50, 21, 21)), true);
  assert.equal(codexUpgradeMatches(19, codexUpgradeValue(15, 20, 9, 11)), true);
  assert.equal(codexUpgradeMatches(20, codexUpgradeValue(20, 30, 5, 16)), false);
  assert.equal(codexUpgradeMatches(1.9, codexUpgradeValue(1.5, 2, 5, 16)), false);
});
