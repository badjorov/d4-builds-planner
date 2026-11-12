// Gear-acquisition checkpoints for ds-s16-proposed.
// Every number here is a file value already used by the Season 16 score, or it is left null.

import { doubleSwingSweepPct } from './s16-score.js';
import { skillRankMultiplier } from './skill-rank.js';

export const STRIPPED = { maxFury: 555, regen: 12, crit: 0.278, cdr: 0.09, attackSpeed: 12.5, casts: 1.1 * 1.125 };
const HIT_TWICE = 0.2;
const DS_COST = 20;
const SESCHERON_FURY = 50;
const RAMALADNI_DRAIN = 0.07;

export function furyNet(opts) {
  const maxFury = opts.maxFury;
  const drain = (opts.ramaladni ? RAMALADNI_DRAIN : 0) * maxFury;
  const spend = DS_COST * opts.casts * (opts.costFactor ?? 1);
  const critFury = 3 * 2 * (1 + HIT_TWICE) * opts.casts * opts.crit;
  const have = opts.regen + (opts.extraRegen || 0) + critFury;
  return { drain, spend, critFury, have, net: have - drain - spend };
}

export function twinStrikesCastRatio(rank = 48) {
  const sweep = doubleSwingSweepPct(rank, 1.5);
  const hit = 1 + HIT_TWICE;
  const devils = 3 * sweep * 0.5 * hit;
  const slice = sweep * 1.2 * hit;
  const plain = 2 * sweep * hit + devils + slice;
  const at = (first, second) => (sweep * first + sweep * second) * hit + devils + slice;
  return {
    sweep,
    rankMultiplier: skillRankMultiplier(rank),
    top: at(1.6, 2.2) / plain,
    low: at(1.45, 1.9) / plain
  };
}

function row(id, label, stats, note) {
  return { id, label, ...stats, note };
}

export function acquisitionCheckpoints() {
  const base = { casts: STRIPPED.casts, crit: STRIPPED.crit };
  const open = furyNet({ ...base, maxFury: STRIPPED.maxFury, regen: STRIPPED.regen, ramaladni: false });
  const pool = furyNet({ ...base, maxFury: STRIPPED.maxFury + SESCHERON_FURY, regen: STRIPPED.regen, ramaladni: false });
  const afterCrucible = furyNet({
    ...base,
    maxFury: STRIPPED.maxFury + SESCHERON_FURY,
    regen: STRIPPED.regen,
    extraRegen: 10,
    costFactor: 0.7,
    ramaladni: false
  });
  const withSword = furyNet({
    ...base,
    maxFury: STRIPPED.maxFury + SESCHERON_FURY,
    regen: STRIPPED.regen,
    extraRegen: 10,
    costFactor: 0.7,
    ramaladni: true
  });
  const gloves = twinStrikesCastRatio();
  const unchanged = { attackSpeed: STRIPPED.attackSpeed, crit: STRIPPED.crit * 100, armor: null, resists: null, critDamage: null, dps: null };
  return [
    row('start', 'No gear', { ...unchanged, ...open, cdr: 9, wrathUptime: 16 / (90 * 0.91) }, 'Stripped sheet. No Ramaladni drain yet.'),
    row('seal', 'Seal of the Diamond Mind', { ...unchanged, ...open, cdr: 9, wrathUptime: 16 / (90 * 0.91) }, 'Set_Item_Discount 1. No damage number.'),
    row('gloves', 'Twin Strikes', { ...unchanged, ...open, cdr: 9, wrathUptime: 16 / (90 * 0.91), castRatioTop: gloves.top, castRatioLow: gloves.low }, '60/120 at the top of 45–60. Berserking for 3 seconds.'),
    row('sescheron', 'Sescheron 5/5', { ...unchanged, ...pool, cdr: 9, wrathUptime: 16 / (90 * 0.91) }, '+50 maximum Fury and 600%[x]. The larger pool does not add regen.'),
    row('crucible', 'Crucible 5/5, after 10s', { ...unchanged, ...afterCrucible, cdr: null, wrathUptime: null }, '+10 Fury/s, 30% cost, 10% CDR. Adding that 10% to the 9% sheet is an estimate, so CDR and uptime stay unresolved.'),
    row('edgemaster', 'Edgemaster ring', { ...unchanged, ...afterCrucible, cdr: null, wrathUptime: null }, 'Full-Fury damage. Rank-1 value is 40%[x]. The model mid 50%[x] is an estimate.'),
    row('crushing', 'Crushing amulet', { ...unchanged, ...afterCrucible, cdr: null, wrathUptime: null }, 'Fortified damage. Rank-1 value is 45%[x]. A second copy is not a second multiplier.'),
    row('ramaladni', "Ramaladni's, after 10s", { ...unchanged, ...withSword, cdr: null, wrathUptime: null }, '7% drain of 605 is 42.35/s. The damage roll on a new drop is 0.35–0.50%[x] per Fury.'),
    row('fists', 'Fists of Fate charm', { ...unchanged, ...withSword, cdr: null, wrathUptime: null }, 'Lucky hit 1% to 250–300%. Not crit chance.'),
    row('tibault', "Tibault's Will", { ...unchanged, ...withSword, cdr: null, wrathUptime: null }, '+25 resource regen while Unstoppable and for 5 seconds after. Uptime is the Wrath window.'),
    row('tuskhelm', 'Tuskhelm', { ...unchanged, ...withSword, cdr: null, wrathUptime: null }, '40–50%[x], 6 Fury/s and 10% CDR while the enrage is up. The 6/s is not steady regen.'),
    row('done', 'Full plan, sustained Fury', { ...unchanged, ...withSword, cdr: 9, wrathUptime: 16 / 68.25, dps: 'headline' }, 'The 1,120.03B/s headline. Attack speed, crit chance, armour and the CDR gap are still the stripped sheet plus unresolved rolls.')
  ];
}
