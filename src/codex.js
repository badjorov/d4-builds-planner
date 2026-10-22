export const CODEX_UPGRADE_FORMULA = 'min + (max - min) * (level - 1) / (maxLevel - 1)';

export function codexUpgradeValue(min, max, level, maxLevel) {
  if (![min, max, level, maxLevel].every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  if (maxLevel <= 1) return min;
  return min + (max - min) * (level - 1) / (maxLevel - 1);
}

export function codexUpgradeMatches(observed, interpolated) {
  if (typeof observed !== 'number' || typeof interpolated !== 'number') return false;
  return Math.abs(observed - interpolated) <= 1e-9;
}
