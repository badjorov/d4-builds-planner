export const CODEX_UPGRADE_FORMULA = 'min + (max - min) * (level - 1) / (maxLevel - 1)';

// `min` is the displayed rank-1 endpoint and `max` is the displayed cap endpoint.
// A high-to-low range is stored in that order and decreases as the rank rises.
export function codexUpgradeValue(min, max, level, maxLevel) {
  if (![min, max, level, maxLevel].every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  if (maxLevel <= 1) return min;
  return min + (max - min) * (level - 1) / (maxLevel - 1);
}

export function codexUpgradeValueFromRange(range, level, maxLevel) {
  if (!Array.isArray(range) || range.length !== 2) return null;
  return codexUpgradeValue(range[0], range[1], level, maxLevel);
}

export function codexUpgradeMatches(observed, interpolated) {
  if (typeof observed !== 'number' || typeof interpolated !== 'number') return false;
  return Math.abs(observed - interpolated) <= 1e-9;
}
