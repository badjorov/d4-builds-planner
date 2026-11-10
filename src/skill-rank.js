import { readFileSync } from 'fs';

const file = JSON.parse(readFileSync(new URL('../data/skill-rank-bonus.json', import.meta.url), 'utf8'));

export const SKILL_RANK_BONUS = file.values;
export const DEFAULT_SKILL_RANK = 41;

export function skillRankMultiplier(rank = DEFAULT_SKILL_RANK) {
  const value = SKILL_RANK_BONUS[rank];
  if (typeof value !== 'number') {
    throw new Error(`Skill rank ${rank} is outside 0..${SKILL_RANK_BONUS.length - 1}.`);
  }
  return value;
}
