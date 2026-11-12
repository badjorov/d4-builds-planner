import { evaluateBuild } from './catalog.js';
import { compute } from './engine.js';
import { rotationReport, simulateBuffRotation } from './rotation.js';
import { DEFAULT_SKILL_RANK, skillRankMultiplier } from './skill-rank.js';
import { ATTACK_SPEED_CAP_LABEL, clampAttackSpeedPct, resolveAttackSpeedCap } from './attack-speed.js';

const FURY = 826;
export const DEFAULT_ATTACK_SPEED_PCT = 120;
export const DEFAULT_WHIRLWIND_WEAPON = '2h-polearm';
export const WHIRLWIND_MEASUREMENT = 'community-measured S15 (3.2), recheck after S16 launch';
export const WHIRLWIND_BREAKPOINT_SOURCES = [
  'https://maxroll.gg/d4/resources/attack-speed-mechanics',
  'https://maxroll.gg/d4/build-guides/whirlwind-barbarian-guide'
];
export const WHIRLWIND_2H_BREAKPOINTS = [
  { attackSpeedPct: 0, frames: 26 },
  { attackSpeedPct: 27.5, frames: 20 },
  { attackSpeedPct: 48.8, frames: 17 },
  { attackSpeedPct: 91, frames: 13 },
  { attackSpeedPct: 143.5, frames: 10 }
];
const WHIRLWIND_WEAPONS = {
  '2h-axe': { label: '2H axe, polearm or mace', framesAtZero: 26, stepped: true },
  '2h-mace': { label: '2H axe, polearm or mace', framesAtZero: 26, stepped: true },
  '2h-polearm': {
    label: '2H polearm',
    framesAtZero: 26,
    stepped: true,
    framesEstimate: true,
    framesNote: 'Polearm-specific frames are an estimate. The measured 0% group is 2H axe, polearm, or mace at 26 frames, and the steps are that 2H table.'
  },
  '2h-sword': { label: '2H sword', framesAtZero: 24, stepped: false },
  '1h': { label: '1H', framesAtZero: 21, stepped: false }
};
const TICKS_AT_ONE_APS = 30 / 13;
const BASE_APS = 1;
const FURY_REGEN = 85;
const WW_FURY_PER_SECOND = 15;
const DS_FURY_PER_CAST = 20;
const FLAY_FURY_GEN = 15;
const FLAY_VERATHIEL_COST = 25;
const LUNGING_FURY = 12;
const BLEED_BASE_DURATION = 5;
const FURY_NOTE = 'Combat Fury 826 is Nikolay\'s observed combat-allbuff reading. These builds do not store their own Fury. Using 826 is an estimate.';

const ENGINE_WHIRLWIND = 386;
const WW_BASE = 1.65;
const WW_TICK_SHARE = 13 / 30;
const DS_LIVE_BASE = 0.75;
const DS_PTR_BASE = 1.5;
const DS_RANK = 48;
const DS_FURY = 827;
const DS_WEAPON_APS = 1.1;
const DS_FURY_COST = 26;
const TWIN_FIRST = 1.6;
const TWIN_SECOND = 2.2;
const HIT_TWICE_CHANCE = 0.2;
const DUST_DEVIL_COEFF = 0.5;
const DUST_DEVIL_COUNT = 3;
const DUST_DEVIL_BONUS = 1.402 * 1.13;
const FLAY_BLEED_BASE = 1.15;
const FLAY_ENGINE_COEFF = 15;
const BLOODLETTER_DURATION = 1.8;

export function whirlwindTooltipPct(rank) {
  return WW_BASE * WW_TICK_SHARE * skillRankMultiplier(rank) * 100;
}

export function doubleSwingSweepPct(rank, base = DS_PTR_BASE) {
  return base * skillRankMultiplier(rank) * 100;
}

export function doubleSwingCastPct(rank, base = DS_PTR_BASE, dustDevilGlyph = true) {
  const sweep = doubleSwingSweepPct(rank, base);
  const weapons = (sweep * TWIN_FIRST + sweep * TWIN_SECOND) * (1 + HIT_TWICE_CHANCE);
  const devilBonus = dustDevilGlyph ? DUST_DEVIL_BONUS : 1;
  const devils = DUST_DEVIL_COUNT * sweep * DUST_DEVIL_COEFF * devilBonus * (1 + HIT_TWICE_CHANCE);
  return { sweep, weapons, devils, total: weapons + devils };
}

export function flayBleedPct(rank, durationFactor = 1) {
  return FLAY_BLEED_BASE * skillRankMultiplier(rank) * 100 * durationFactor;
}

const LINES = {
  ramaladniObserved: {
    name: "Ramaladni's Magnum Opus",
    bucket: 'multiplicative',
    min: 0.5,
    max: 0.5,
    perFury: true,
    always: true,
    label: '0.50%[x] per Fury. Screenshot roll, top of [0.35-0.50]. Maximum Fury 827.'
  },
  tibaultObserved: {
    name: "Tibault's Will",
    bucket: 'multiplicative',
    min: 26,
    max: 26,
    when: 'unstoppable',
    label: '26%[x] while Unstoppable. Screenshot roll, top of [20-26].'
  },
  ramaladni: {
    name: "Ramaladni's Magnum Opus",
    bucket: 'multiplicative',
    min: 0.35,
    max: 0.5,
    perFury: true,
    always: true,
    label: '0.35–0.50%[x] per Fury'
  },
  tibault: {
    name: "Tibault's Will",
    bucket: 'multiplicative',
    min: 15,
    max: 20,
    when: 'unstoppable',
    label: '15–20%[x] while Unstoppable'
  },
  earthstriker: {
    name: "Earthstriker's",
    bucket: 'multiplicative',
    min: 19.5,
    max: 19.5,
    when: 'overpower',
    label: '19.5%[x] [15.5-20.5] while you have Overpower. Screenshot imprint. The catalog stores the same 19.5%[x].'
  },
  starless: {
    name: 'Ring of Starless Skies',
    bucket: 'multiplicative',
    min: 10,
    max: 50,
    always: true,
    label: '10%[x] for 3s on spending Fury, up to 50%[x]. The sustained reading is 50%[x]. That uptime is an estimate.'
  },
  selig: {
    name: 'Melted Heart of Selig',
    bucket: 'multiplicative',
    min: 30,
    max: 30,
    always: true,
    label: '30%[x] while above 50 Fury. The dummy kept Fury full. Uptime 1.'
  },
  spiritAll: {
    name: 'Spirit, All Damage',
    bucket: 'multiplicative',
    min: 66,
    max: 66,
    always: true,
    label: 'x66% All Damage Multiplier on the dual-wield sword.'
  },
  ambidextrous: {
    name: 'Ambidextrous',
    bucket: 'multiplicative',
    min: 18.1,
    max: 18.1,
    always: true,
    label: '8%[x] with one-handed weapons plus legendary 10.1%[x]. Level 97. Combined as 18.1%[x] because both are always on while dual wielding.'
  },
  exploit: {
    name: 'Exploit, Vulnerable',
    bucket: 'multiplicative',
    min: 13.6,
    max: 13.6,
    always: true,
    label: 'Legendary +13.6%[x] to Vulnerable. The per-5-Dexterity line has no [x] tag and stays out.'
  },
  marshalGlyph: {
    name: 'Marshal',
    bucket: 'multiplicative',
    min: 13.9,
    max: 13.9,
    always: true,
    label: 'Legendary +13.9%[x]. Level 135.'
  },
  oneEnemy: {
    name: 'Double Swing Damage Increase',
    bucket: 'multiplicative',
    min: 2,
    max: 2,
    always: true,
    label: '+2%[x] per enemy hit. The boss dummy is one stack. A pack is not scored.'
  },
  warbringer: {
    name: 'Warbringer',
    bucket: 'multiplicative',
    min: 45,
    max: 45,
    always: true,
    label: '45%[x] while Fortified. Challenging Shout fortifies. Uptime 1 is an estimate.'
  },
  decimatorVuln: {
    name: 'Decimator, Vulnerable',
    bucket: 'multiplicative',
    min: 25,
    max: 25,
    always: true,
    label: '25%[x] to Vulnerable. Screenshot legendary node.'
  },
  decimatorOver: {
    name: 'Decimator, Overpower',
    bucket: 'multiplicative',
    min: 25,
    max: 25,
    when: 'overpower',
    label: '25%[x] while you have Overpower charges.'
  },
  weaponsMaster: {
    name: 'Weapons Master',
    bucket: 'multiplicative',
    min: 75,
    max: 75,
    always: true,
    label: '75%[x] to Injured and Healthy enemies. The dummy starts Healthy. Uptime 1 is an estimate for the whole minute.'
  },
  tuskhelmBerserk: {
    name: 'Tuskhelm of Joritz the Mighty',
    bucket: 'multiplicative',
    min: 45,
    max: 45,
    always: true,
    label: 'Mid of the stored 40–50%[x] when you gain Berserking while already Berserking. Uptime 1 is an estimate. Mid-roll.'
  },
  edgemaster: {
    name: "Edgemaster's Aspect",
    bucket: 'multiplicative',
    min: 50,
    max: 50,
    always: true,
    label: 'Mid of 40–60%[x] at full Fury. The stripped sheet does not stay full, so this is an upper reading. Mid-roll.'
  },
  edgemasterHalf: {
    name: "Edgemaster's Aspect",
    bucket: 'multiplicative',
    min: 25,
    max: 25,
    always: true,
    label: 'Half of the 50%[x] full-Fury mid, for a bar that drains. Resource fraction 0.5 is an estimate.'
  },
  crushingMid: {
    name: 'Crushing',
    bucket: 'multiplicative',
    min: 55,
    max: 55,
    always: true,
    label: 'Mid of the stored 45–65%[x] while Fortified. Fortified uptime 1 is an estimate. Mid-roll.'
  },
  heavyHitting: {
    name: 'Heavy Hitting',
    bucket: 'multiplicative',
    min: 50,
    max: 50,
    always: true,
    label: 'Mid of 40–60%[x] for Dust Devils, Earthquakes, or Iron Shrapnel. Applied only when the cast still creates Dust Devils. Mid-roll.'
  },
  grandfatherCrit: {
    name: 'The Grandfather',
    bucket: 'crit-mult',
    min: 120,
    max: 120,
    always: true,
    label: 'PTR Affix_Value_1 is 120 and the string is %x Critical Strike Damage. It may apply only while that weapon swings. Double Swing swings the swords.'
  },
  challenger: {
    name: 'Challenger',
    bucket: 'multiplicative',
    min: 15.6,
    max: 15.6,
    always: true,
    label: 'Stored legendary text +15.6%[x] vs Elites at a transcribed level. His new glyph level is not in the screenshots. Boss-dummy uptime 1 is an estimate.'
  },
  nomad: {
    name: "Nomad's Longing Heart",
    bucket: 'multiplicative',
    min: 70,
    max: 70,
    always: true,
    label: 'Mid of 30–40%[x] is 35%[x]. The string doubles that against Healthy and Injured, so the scored line is 70%[x]. That uptime is an estimate. The cost is 25%[x] more Fury.'
  },
  bloodMad: {
    name: 'Blood-Mad Idol',
    bucket: 'multiplicative',
    min: 90,
    max: 90,
    always: true,
    label: 'Mid of the file range 80–100%[x]. Always Berserking. The 200%[x] over 8 seconds is damage taken and is not scored as damage dealt.'
  },
  skullGem: {
    name: 'Skull in the swinging sword',
    bucket: 'multiplicative',
    min: 20,
    max: 20,
    always: true,
    label: 'Flawless skull weapon socket is 20%[x] damage. One swinging sword. The second sword is not stacked.'
  },
  physicalGem: {
    name: 'Swinging sword gem',
    bucket: 'multiplicative',
    min: 24,
    max: 24,
    always: true,
    label: 'x24% Physical Damage Multiplier in the swinging sword. The other sword has the same gem and is not stacked on top. Estimate.'
  },
  crushing: {
    name: 'Crushing',
    bucket: 'multiplicative',
    min: 45,
    max: 65,
    always: true,
    label: '45–65%[x] while Fortified. Rank 1 and rank 21. Unverified.'
  },
  redFuror: {
    name: 'Ring of Red Furor',
    bucket: 'multiplicative',
    min: 50,
    max: 60,
    peakOnly: true,
    label: '50–60%[x] on the next Core cast. Peak only.'
  },
  verathiel: {
    name: 'Shard of Verathiel',
    bucket: 'multiplicative',
    min: 70,
    max: 100,
    always: true,
    label: '70–100%[x] Basic Skill damage'
  },
  hooves: {
    name: 'Hooves of the Mountain God',
    bucket: 'multiplicative',
    min: 45,
    max: 60,
    peakOnly: true,
    label: '45–60%[x] during the Fury drain. Peak only.'
  },
  moonrise: {
    name: 'of the Moonrise',
    bucket: 'multiplicative',
    min: 60,
    max: 100,
    peakOnly: true,
    label: '60–100%[x] Basic damage in Bloodrage. Rank 1 and rank 21. Peak only.'
  },
  fists: {
    name: 'Fists of Fate',
    bucket: 'multiplicative',
    // "1% to [250–300]% of normal damage" replaces the hit. EV of uniform(1, cap) / 100.
    min: ((1 + 250) / 2 / 100 - 1) * 100,
    max: ((1 + 300) / 2 / 100 - 1) * 100,
    always: true,
    estimate: true,
    label: 'Expected value of a hit that deals 1% to 250–300% of normal damage. Low roll EV ×1.255, high roll EV ×1.505. Estimate. Switchable off.'
  },
  sescheronPartial: {
    name: "Sescheron's Fury, below 5 pieces",
    bucket: 'multiplicative',
    min: 120,
    max: 120,
    when: 'colossal',
    label: 'Power 01 is 120%[x] while Colossal. Power 03 replaces it with 600%[x], so this line is the set while the 5-piece is off. Fury 827 stays above 100. Estimate that 4/5 still has power 01.'
  },
  sescheron: {
    name: "Sescheron's Fury, Colossal damage",
    bucket: 'multiplicative',
    min: 600,
    max: 600,
    when: 'colossal',
    label: '600%[x] while Colossal (Fury at or above 100). Power 03 replaces the 120%[x] on power 01. Uptime 1 because Fury 826 stays above 100. Estimate.'
  },
  cruciblePlus: {
    name: "Berserker's Crucible, Berserking damage",
    bucket: 'additive',
    min: 50,
    max: 50,
    when: 'berserk',
    label: '50%[+] to Berserking\'s damage bonus. On during the War Cry and Wrath windows.'
  },
  crucibleStreak: {
    name: "Berserker's Crucible, 5s Berserking",
    bucket: 'multiplicative',
    min: 200,
    max: 200,
    when: 'streak5',
    label: '200%[x] after 5 seconds of Berserking. The full-overlap peak is the first 4 seconds, so this is off the peak. The average uses the share of each slice after the 5 second mark.'
  },
  bloodletterBleed: {
    name: "Bloodletter's Flow, Bleeding damage",
    bucket: 'multiplicative',
    min: 200,
    max: 200,
    always: true,
    label: '200%[x] increased Bleeding damage. Static value. Applies to the bleed.'
  },
  mightTwoHander: {
    name: 'Might, two-handed damage',
    bucket: 'multiplicative',
    min: 8,
    max: 8,
    always: true,
    label: '8%[x] with a Two-Handed weapon. Added only when the equipped Might glyph is absent from the score.'
  },
  polearm: {
    name: 'Polearm Expertise',
    bucket: 'multiplicative',
    min: 15,
    max: 15,
    always: true,
    label: 'Rank 10 is 15%[x] while Healthy. PTR Barbarian_WeaponExpertise_2HPolearm_Rank10 SF_0 is 0.15. Per level, Lucky Hit Chance is 0.015 × level, so rank 10 is also 15% Lucky Hit Chance. Level 10/10. Player Healthy uptime is 1. That uptime is an estimate.'
  },
  mace: {
    name: 'One-Handed Mace Expertise',
    bucket: 'multiplicative',
    expertise: true,
    always: true,
    label: '1%[x] per expertise level, doubled with two maces, against Stunned enemies or Bosses. The boss score keeps it on. Level 10 and two maces are estimates.'
  }
};

function percent(spec, end, opts) {
  if (spec.expertise) {
    const level = typeof opts.expertiseLevel === 'number' ? opts.expertiseLevel : 10;
    const maces = opts.twoMaces === false ? 1 : 2;
    return level * maces;
  }
  const roll = end === 'min' ? spec.min : spec.max;
  const fury = typeof opts.fury === 'number' ? opts.fury : FURY;
  return spec.perFury ? roll * fury : roll;
}

function lineOn(spec, slice, info) {
  if (spec.peakOnly && !info.peak) return false;
  if (spec.when === 'unstoppable' && slice.unstoppable !== 1) return false;
  if (spec.when === 'overpower' && slice.overpower !== 1) return false;
  if (spec.when === 'berserk' && slice.berserk !== 1) return false;
  if (spec.when === 'streak5' && !(slice.berserkStreak5 > 0)) return false;
  if (spec.when === 'colossal') return true;
  return true;
}

function modifiersFor(specs, end, slice, info, opts) {
  const lines = [];
  for (const spec of specs) {
    if (!lineOn(spec, slice, info)) continue;
    const roll = percent(spec, end, opts);
    const value = spec.when === 'streak5' ? roll * slice.berserkStreak5 : roll;
    if (!value) continue;
    const mod = {
      id: spec.name,
      name: spec.name,
      bucket: spec.bucket,
      value,
      active: true,
      kind: 'unique',
      estimate: true
    };
    if (spec.bucket === 'additive') mod.sheetConditional = true;
    lines.push(mod);
  }
  return lines;
}

function bareBuild(build, skillIds) {
  const next = structuredClone(build);
  next.souls = 0;
  next.skills = skillIds;
  next.talismans = [];
  for (const slot of next.gear || []) {
    slot.uniqueId = null;
    slot.aspectId = null;
    slot.affixes = [];
  }
  return next;
}

function billions(total) {
  const rounded = Math.round(total / 1e7) / 100;
  const [whole, frac] = rounded.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}B`;
}

export const S16_DEFINITIONS = [
  {
    id: 's16-double-swing',
    name: 'Double Swing',
    timelineSkills: ['double-swing', 'war-cry', 'rallying-cry', 'challenging-shout', 'wrath-of-the-berserker', 'iron-skin'],
    hitSkill: 'whirlwind',
    storedCoeff: 461,
    rank: DS_RANK,
    fury: DS_FURY,
    weaponAps: DS_WEAPON_APS,
    noOverpower: false,
    swings: 2,
    scoredLines: ['ramaladniObserved', 'tibaultObserved', 'earthstriker', 'starless', 'selig', 'spiritAll', 'ambidextrous', 'exploit', 'marshalGlyph', 'oneEnemy', 'warbringer', 'decimatorVuln', 'decimatorOver', 'weaponsMaster', 'physicalGem'],
    coeffNote: 'Live SF_1 is 0.75 and the rank-48 tooltip is 461.25% per weapon. PTR SF_1 is 1.5, so the same rank is 922.5% per weapon. Twin Strikes is 60%[x] then 120%[x]. Chance to Hit Twice is a 20% expected extra hit. Each Dust Devil payload is SF_0 × 0.5, and a cast creates 3.'
  },
  {
    id: 's16-whirlwind',
    name: 'Whirlwind',
    timelineSkills: ['whirlwind', 'rallying-cry', 'challenging-shout', 'iron-skin', 'war-cry', 'wrath-of-the-berserker'],
    hitSkill: 'whirlwind',
    storedCoeff: 386,
    noOverpower: false,
    scoredLines: ['ramaladni', 'sescheron', 'cruciblePlus', 'crucibleStreak', 'polearm'],
    coeffNote: 'Whirlwind formulas match on 3.2 and 3.3_ptr. The tooltip payload is 1.65 × 13/30 × SkillRankBonus[rank]. At rank 41 that is 386.1%, the stored 386%.'
  },
  {
    id: 's16-flay',
    name: 'Flay',
    timelineSkills: ['flay', 'rupture', 'war-cry', 'challenging-shout', 'rallying-cry', 'wrath-of-the-berserker'],
    hitSkill: 'flay',
    storedCoeff: 45,
    noOverpower: true,
    forceVulnerable: true,
    dot: true,
    bleedDuration: 1.8,
    scoredLines: ['ramaladni', 'tibault', 'verathiel', 'hooves', 'moonrise', 'bloodletterBleed'],
    coeffNote: 'Flay is Power Barbarian_Maim. Bleed total is 1.15 × SkillRankBonus[rank] over 5 seconds. Bloodletter\'s 2-piece makes that duration 80%[x] longer, so the scored total is multiplied by 1.8. Crit is off. The bleed dot has no overpower term. The 2-piece also makes bleeding enemies Vulnerable, so Vulnerable stays on.'
  }
];

const VARIANTS = {
  flurry: 0.5 * 2,
  sliceAndDice: 1.2,
  twister: 0.5
};

function coefficient(definition, rank, opts) {
  const mult = skillRankMultiplier(rank);
  if (definition.id === 's16-whirlwind') {
    const pct = WW_BASE * WW_TICK_SHARE * mult * 100;
    return { ptrCoeff: pct, coeffRatio: pct / ENGINE_WHIRLWIND, previous: 165 };
  }
  if (definition.id === 's16-double-swing') {
    const live = doubleSwingCastPct(rank, DS_LIVE_BASE, opts.dustDevilGlyph !== false);
    const ptr = doubleSwingCastPct(rank, DS_PTR_BASE, opts.dustDevilGlyph !== false);
    let extra = 0;
    if (opts.variants?.sliceAndDice) extra += ptr.sweep * VARIANTS.sliceAndDice * (1 + HIT_TWICE_CHANCE);
    return {
      ptrCoeff: ptr.total + extra,
      liveCoeff: live.total,
      sweep: ptr.sweep,
      sweeps: (ptr.total + extra) / ptr.sweep,
      coeffRatio: (ptr.total + extra) / ENGINE_WHIRLWIND,
      previous: live.sweep
    };
  }
  const duration = definition.bleedDuration || 1;
  const pct = FLAY_BLEED_BASE * mult * 100 * duration;
  return { ptrCoeff: pct, coeffRatio: pct / FLAY_ENGINE_COEFF, previous: 115 };
}

function activeLines(definition, opts) {
  return definition.scoredLines
    .filter(id => id !== 'fists' || (definition.fistsOfFate && opts.fistsOfFate !== false))
    .map(id => LINES[id]);
}

function withSkillTiming(catalog, timing) {
  if (!timing) return catalog;
  return {
    ...catalog,
    skills: (catalog.skills || []).map(skill => timing[skill.id] ? { ...skill, ...timing[skill.id] } : skill)
  };
}

function runReport(catalog, build, definition, specs, end, opts) {
  return rotationReport(withSkillTiming(catalog, opts.skillTiming), build, {
    souls: 0,
    hitSkill: definition.hitSkill,
    noOverpower: definition.noOverpower === true,
    forceVulnerable: definition.forceVulnerable === true,
    alwaysBerserk: opts.alwaysBerserk === true,
    holdBuffs: opts.holdBuffs,
    cdrPct: opts.cdrPct,
    shoutCutSeconds: opts.shoutCutSeconds,
    extraModifiersFor: (slice, info) => modifiersFor(specs, end, slice, info, opts)
  });
}

function withObservedDoubleSwing(build) {
  const next = structuredClone(build);
  next.glyphs = [];
  next.boards = [];
  next.weaponDmg = { town: 4596, combat: null };
  next.mainStat = { town: 4155, combat: null };
  next.maxFury = { town: DS_FURY, combat: null };
  next.currentFury = DS_FURY;
  next.critChance = { town: 100, combat: null, 'combat-nobuff': 100, 'combat-allbuff': 100 };
  next.critDmg = { town: 7139, combat: null, 'combat-nobuff': 10396.6, 'combat-allbuff': 10396.6 };
  next.additivePct = {
    town: 1627.8,
    combat: null,
    'combat-nobuff': 1627.8,
    'combat-allbuff': 8211.3,
    'combat-allbuff-high': 12482.6
  };
  next.offensiveSheet = {
    ...(next.offensiveSheet || {}),
    vulnerable: { town: 648, 'combat-allbuff': 648, 'combat-nobuff': 648 },
    vsElites: { town: 663.7, 'combat-allbuff': 663.7 },
    vsHealthy: { town: 206.3, 'combat-allbuff': 206.3 },
    vsInjured: { town: 206.3, 'combat-allbuff': 206.3 }
  };
  return next;
}

export function scoreS16Build(catalog, savedBuild, definition, opts = {}) {
  const rank = typeof opts.rank === 'number' ? opts.rank : (definition.rank ?? DEFAULT_SKILL_RANK);
  const local = { ...opts, fury: definition.fury ?? opts.fury };
  const coeff = coefficient(definition, rank, local);
  let build = bareBuild(savedBuild, definition.timelineSkills);
  if (definition.id === 's16-double-swing') build = withObservedDoubleSwing(build);
  const specs = activeLines(definition, local);
  const might = definition.id === 's16-whirlwind' ? mightTwoHander(catalog, build) : null;
  if (might && !might.applied) specs.push(LINES.mightTwoHander);
  const min = runReport(catalog, build, definition, specs, 'min', local);
  const max = runReport(catalog, build, definition, specs, 'max', local);
  const scale = coeff.coeffRatio;
  const withoutSets = specs.filter(spec => !spec.name.includes('Fury') && !spec.name.includes('Crucible') && !spec.name.includes('Bloodletter'));
  const base = runReport(catalog, build, definition, withoutSets, 'max', local);
  const isolation = [];
  for (const spec of specs.filter(item => /Fury|Crucible|Bloodletter/.test(item.name))) {
    const alone = runReport(catalog, build, definition, [...withoutSets, spec], 'max', local);
    isolation.push({
      name: spec.name,
      bucket: spec.bucket === 'additive' ? '[+]' : '[x]',
      value: spec.max,
      peak: base.peak.total ? alone.peak.total / base.peak.total : null,
      average: base.average.total ? alone.average.total / base.average.total : null
    });
  }
  return {
    id: definition.id,
    name: definition.name,
    fury: definition.fury ?? FURY,
    rank,
    rankMultiplier: skillRankMultiplier(rank),
    storedCoeff: definition.storedCoeff,
    previousCoeff: coeff.previous,
    ptrCoeff: coeff.ptrCoeff,
    sweep: coeff.sweep ?? null,
    sweeps: coeff.sweeps ?? null,
    dot: definition.dot === true,
    coeffNote: definition.coeffNote,
    furyNote: FURY_NOTE,
    min: { peak: min.peak.total * scale, average: min.average.total * scale },
    max: { peak: max.peak.total * scale, average: max.average.total * scale },
    isolation,
    attackSpeed: attackSpeedFactor(opts),
    mightTwoHander: might,
    attackSpeedModel: definition.id === 's16-whirlwind' ? whirlwindModel(opts) : null,
    whirlwind: definition.id === 's16-whirlwind' ? whirlwindTiming(opts) : null,
    furyReport: furyReport(definition.id, opts),
    dps: {
      min: dpsOf(definition.id, { peak: min.peak.total * scale, average: min.average.total * scale }, furyReport(definition.id, opts)),
      max: dpsOf(definition.id, { peak: max.peak.total * scale, average: max.average.total * scale }, furyReport(definition.id, opts))
    },
    wrathSplit: {
      uptime: max.wrathSplit.uptime,
      on: dpsOf(definition.id, { peak: (max.wrathSplit.on || 0) * scale, average: (max.wrathSplit.on || 0) * scale }, furyReport(definition.id, opts)),
      off: max.wrathSplit.off == null ? null : dpsOf(definition.id, { peak: max.wrathSplit.off * scale, average: max.wrathSplit.off * scale }, furyReport(definition.id, opts))
    },
    flatDps: definition.id === 's16-whirlwind'
      ? {
        min: dpsOf(definition.id, { peak: min.peak.total * scale, average: min.average.total * scale }, whirlwindFury({ ...opts, whirlwindAttackSpeedModel: 'flat' })),
        max: dpsOf(definition.id, { peak: max.peak.total * scale, average: max.average.total * scale }, whirlwindFury({ ...opts, whirlwindAttackSpeedModel: 'flat' }))
      }
      : null,
    lines: specs.map(spec => ({
      name: spec.name,
      bucket: spec.bucket === 'multiplicative' ? '[x]' : '[+]',
      min: spec.perFury ? spec.min : spec.min,
      max: spec.perFury ? spec.max : spec.max,
      label: spec.label
    }))
  };
}

export function scoreS16(catalog, savedBuild, opts = {}) {
  return S16_DEFINITIONS.map(definition => scoreS16Build(catalog, savedBuild, definition, opts));
}

export function attackSpeedFactor(opts = {}) {
  const requested = typeof opts.attackSpeedPct === 'number' ? opts.attackSpeedPct : DEFAULT_ATTACK_SPEED_PCT;
  const clamped = clampAttackSpeedPct(requested, opts);
  return {
    bonus: clamped.effective,
    requested: clamped.requested,
    cap: clamped.cap,
    overCap: clamped.overCap,
    capLabel: ATTACK_SPEED_CAP_LABEL,
    baseAps: BASE_APS,
    aps: BASE_APS * (1 + clamped.effective / 100)
  };
}

function mightTwoHander(catalog, build) {
  const scored = evaluateBuild(catalog, { ...build, skills: ['whirlwind'] });
  const lines = (scored.input.modifiers || []).filter(mod => mod.id === 'might' && mod.value === 8);
  return { applied: lines.length > 0, count: lines.length, value: 8 };
}

export function whirlwindModel(opts = {}) {
  return opts.whirlwindAttackSpeedModel === 'flat' ? 'flat' : 'breakpoints';
}

function whirlwindWeapon(opts = {}) {
  const id = opts.whirlwindWeapon || DEFAULT_WHIRLWIND_WEAPON;
  return { id, ...(WHIRLWIND_WEAPONS[id] || WHIRLWIND_WEAPONS[DEFAULT_WHIRLWIND_WEAPON]) };
}

export function whirlwindFrames(attackSpeedPct = DEFAULT_ATTACK_SPEED_PCT, weaponId = DEFAULT_WHIRLWIND_WEAPON) {
  const weapon = whirlwindWeapon({ whirlwindWeapon: weaponId });
  let step = WHIRLWIND_2H_BREAKPOINTS[0];
  for (const row of WHIRLWIND_2H_BREAKPOINTS) {
    if (attackSpeedPct + 1e-9 >= row.attackSpeedPct) step = row;
  }
  const stepped = weapon.stepped;
  const frames = stepped ? step.frames : weapon.framesAtZero * (step.frames / 26);
  return {
    weaponId: weapon.id,
    weapon: weapon.label,
    attackSpeedPct,
    breakpointPct: step.attackSpeedPct,
    frames,
    interpolated: !stepped && attackSpeedPct > 0,
    framesEstimate: weapon.framesEstimate === true,
    framesNote: weapon.framesNote || null,
    estimate: true,
    label: WHIRLWIND_MEASUREMENT
  };
}

export function whirlwindTiming(opts = {}) {
  const speed = attackSpeedFactor(opts);
  const capFields = { cap: speed.cap, requestedAttackSpeedPct: speed.requested, capLabel: speed.capLabel };
  if (whirlwindModel(opts) === 'flat') {
    return {
      model: 'flat',
      frames: null,
      ticksPerSecond: TICKS_AT_ONE_APS,
      attackSpeedPct: speed.bonus,
      ...capFields,
      weapon: whirlwindWeapon(opts).label,
      interpolated: false,
      estimate: false,
      label: 'Literal power formulas. Per-tick damage and the tick rate both follow attacks per second, so damage per second stays at the 1.0 APS tooltip rate.'
    };
  }
  const frames = whirlwindFrames(speed.bonus, opts.whirlwindWeapon);
  return {
    model: 'breakpoints',
    ...frames,
    ticksPerSecond: 60 / frames.frames,
    ...capFields
  };
}

const TICK_SCALED_KINDS = new Set(['direct', 'lucky-hit', 'on-hit']);
const UNSCALED_KINDS = new Set(['dust-devil', 'flat-dot']);

export function whirlwindEffectPerSecond(effect, ticksPerSecond) {
  if (UNSCALED_KINDS.has(effect.kind)) return effect.perSecond;
  if (TICK_SCALED_KINDS.has(effect.kind)) return effect.perTick * ticksPerSecond;
  throw new Error(`Unknown Whirlwind effect kind ${effect.kind}.`);
}

function passiveFury() {
  return FURY_REGEN - (7 / 100) * FURY;
}

export function whirlwindFury(opts = {}) {
  const timing = whirlwindTiming(opts);
  const generation = passiveFury();
  const cost = WW_FURY_PER_SECOND * (timing.ticksPerSecond / TICKS_AT_ONE_APS);
  const net = generation - cost;
  const poolSeconds = net >= 0 ? Infinity : FURY / -net;
  const spenderUptime = net >= 0 ? 1 : Math.min(1, poolSeconds / 60);
  return {
    ...timing,
    action: 'ticks',
    actionsPerSecond: timing.ticksPerSecond,
    costPerSecond: cost,
    generationPerSecond: generation,
    net,
    poolSeconds,
    sustainable: net >= 0,
    holdsFor60: spenderUptime >= 1,
    spenderUptime,
    attackSpeedChangesDamage: timing.model === 'breakpoints'
  };
}

function furyReport(id, opts) {
  const speed = attackSpeedFactor(opts);
  const passive = passiveFury();
  const estimates = [
    `Attack speed bonus +${speed.bonus}% is the S15 sheet value. Estimate for these builds.`,
    'Base attacks per second is 1 for Double Swing and Flay. The power files use Attacks_Per_Second_Total and the mace item type stores +10% weapon speed, not a base rate. The sheet bonus is not increased by that +10%.',
    `Fury regeneration ${FURY_REGEN}/s is the town sheet. Combat regeneration is null. Estimate.`,
    `Ramaladni drains 7% of maximum Fury per second. Maximum Fury ${FURY} is the combat reading. Estimate.`
  ];
  if (id === 's16-whirlwind') {
    const fury = whirlwindFury(opts);
    return {
      spender: 'Whirlwind',
      ...fury,
      estimates: estimates.concat(
        fury.model === 'breakpoints'
          ? `${WHIRLWIND_MEASUREMENT}. Weapon defaults to ${fury.weapon}. Per-tick damage stays the rank-41 tooltip value. Fury per second is 15 times the tick rate divided by the 1.0 APS tick rate.`
          : 'Flat model. Fury per second stays 15.'
      )
    };
  }
  if (id === 's16-double-swing') {
    const casts = DS_WEAPON_APS * (1 + speed.bonus / 100);
    const cost = DS_FURY_COST * casts;
    const drain = (7 / 100) * DS_FURY;
    const regen = 80;
    const critFury = 3 * (2 * (1 + HIT_TWICE_CHANCE)) * casts;
    const bare = regen - drain - cost;
    const withCrit = bare + critFury;
    return {
      spender: 'Double Swing',
      actionsPerSecond: casts,
      action: 'casts',
      costPerSecond: cost,
      generationPerSecond: regen - drain,
      critFuryPerSecond: critFury,
      net: bare,
      netWithCritFury: withCrit,
      netWithCritAndUnstoppable: withCrit + 25,
      sustainable: false,
      holdsFor60: true,
      spenderUptime: 1,
      attackSpeedChangesDamage: true,
      estimates: estimates.concat('The bar has no Basic skill. The dummy kept Fury full for 30s, so spender uptime is 1. Sheet regen 80 minus Ramaladni 7% of 827 minus the 26 Fury tooltip cost does not cover the casts. Wrath generates 3 Fury per critical strike, and Tibault adds 25 while Unstoppable. Starless also reduces cost by an unstated amount. Those sources are the gap.')
    };
  }
  const casts = speed.aps * 1.25;
  const generated = FLAY_FURY_GEN * casts;
  const cost = FLAY_VERATHIEL_COST * casts;
  const net = passive + generated - cost;
  const poolSeconds = net >= 0 ? Infinity : FURY / -net;
  const spenderUptime = net >= 0 ? 1 : Math.min(1, poolSeconds / 60);
  return {
    spender: 'Flay',
    actionsPerSecond: casts,
    action: 'casts',
    costPerSecond: cost,
    generationPerSecond: generated + passive,
    net,
    poolSeconds,
    sustainable: net >= 0,
    holdsFor60: spenderUptime >= 1,
    spenderUptime,
    attackSpeedChangesDamage: true,
    estimates: estimates.concat('Shard of Verathiel adds 25 Fury per Flay cast. Flay itself generates 15. There is no second generator on the bar.')
  };
}

function dpsOf(id, hit, fury) {
  if (id === 's16-whirlwind') {
    return {
      peak: hit.peak * fury.ticksPerSecond,
      average: hit.average * fury.ticksPerSecond * fury.spenderUptime
    };
  }
  if (id === 's16-double-swing') {
    return {
      peak: hit.peak * fury.actionsPerSecond,
      average: hit.average * fury.actionsPerSecond * fury.spenderUptime
    };
  }
  const duration = BLEED_BASE_DURATION * BLOODLETTER_DURATION;
  return { peak: hit.peak / duration, average: hit.average / duration * fury.spenderUptime };
}

export function whirlwindBreakpointTable(catalog, savedBuild, opts = {}) {
  const definition = S16_DEFINITIONS.find(item => item.id === 's16-whirlwind');
  const weaponId = opts.whirlwindWeapon || DEFAULT_WHIRLWIND_WEAPON;
  const cap = resolveAttackSpeedCap(opts);
  const scored = scoreS16Build(catalog, savedBuild, definition, {
    ...opts,
    attackSpeedPct: 0,
    whirlwindAttackSpeedModel: 'breakpoints',
    whirlwindWeapon: weaponId
  });
  const ticksAtZero = scored.whirlwind.ticksPerSecond;
  const perTick = {
    minPeak: scored.dps.min.peak / ticksAtZero,
    minAverage: scored.dps.min.average / ticksAtZero,
    maxPeak: scored.dps.max.peak / ticksAtZero,
    maxAverage: scored.dps.max.average / ticksAtZero
  };
  const requested = opts.attackSpeedPct ?? DEFAULT_ATTACK_SPEED_PCT;
  const landing = whirlwindFrames(Math.min(requested, cap), weaponId);
  return WHIRLWIND_2H_BREAKPOINTS.map(step => {
    const aboveCap = step.attackSpeedPct > cap + 1e-9;
    const fury = whirlwindFury({
      ...opts,
      attackSpeedPct: step.attackSpeedPct,
      ignoreAttackSpeedCap: aboveCap,
      whirlwindAttackSpeedModel: 'breakpoints',
      whirlwindWeapon: weaponId
    });
    return {
      attackSpeedPct: step.attackSpeedPct,
      frames: fury.frames,
      aboveCap,
      referenceOnly: aboveCap,
      ticksPerSecond: fury.ticksPerSecond,
      dps: {
        min: {
          peak: perTick.minPeak * fury.ticksPerSecond,
          average: perTick.minAverage * fury.ticksPerSecond * fury.spenderUptime
        },
        max: {
          peak: perTick.maxPeak * fury.ticksPerSecond,
          average: perTick.maxAverage * fury.ticksPerSecond * fury.spenderUptime
        }
      },
      costPerSecond: fury.costPerSecond,
      generationPerSecond: fury.generationPerSecond,
      net: fury.net,
      holdsFor60: fury.holdsFor60,
      spenderUptime: fury.spenderUptime,
      sustainable: fury.sustainable,
      poolSeconds: fury.poolSeconds,
      defaultLanding: !aboveCap && landing.breakpointPct === step.attackSpeedPct,
      label: WHIRLWIND_MEASUREMENT
    };
  });
}

export function liveDoubleSwingHit() {
  const cast = doubleSwingCastPct(DS_RANK, DS_LIVE_BASE);
  const lines = [
    ['Ramaladni', 0.5 * DS_FURY],
    ['Tibault', 26],
    ['Earthstriker', 19.5],
    ['Starless', 50],
    ['Selig', 30],
    ['Spirit', 66],
    ['Ambidextrous', 18.1],
    ['Exploit', 13.6],
    ['Marshal', 13.9],
    ['One enemy', 2],
    ['Warbringer', 45],
    ['Decimator Vulnerable', 25],
    ['Decimator Overpower', 25],
    ['Weapons Master', 75],
    ['Sword gem', 24]
  ];
  const base = {
    weaponDmg: 4596,
    coeffPct: cast.total,
    additivePct: 12482.6 + 648 + 663.7 + 206.3,
    mainStat: 4155,
    mainStatPer10: 0.8,
    critChance: 100,
    critDmg: 10396.6,
    vulnerable: true,
    modifiers: []
  };
  const sheetOnly = compute(base).total;
  const withMultipliers = compute({
    ...base,
    modifiers: lines.map(([name, value]) => ({ name, bucket: 'multiplicative', value, active: true }))
  }).total;
  return {
    cast,
    sheetOnly,
    withMultipliers,
    observed: [13e9, 157e9],
    top: [139e9, 157e9]
  };
}

export function doubleSwingUpgradeGains(catalog, savedBuild) {
  const definition = S16_DEFINITIONS.find(item => item.id === 's16-double-swing');
  const current = scoreS16Build(catalog, savedBuild, definition);
  const withFifth = scoreS16Build(catalog, savedBuild, {
    ...definition,
    scoredLines: [...definition.scoredLines, 'crucibleStreak']
  });
  const withoutTwo = {
    ...definition,
    scoredLines: definition.scoredLines.filter(id => id !== 'oneEnemy')
  };
  const withSlice = scoreS16Build(catalog, savedBuild, withoutTwo, { variants: { sliceAndDice: true } });
  const perTen = current.dps.max.average * (1.1 / 1) - current.dps.max.average;
  return {
    current: current.dps.max.average,
    crucibleFive: withFifth.dps.max.average - current.dps.max.average,
    sliceInstead: withSlice.dps.max.average - current.dps.max.average,
    perTenMultiplicative: perTen
  };
}

const PROPOSED_LINES = ['ramaladniObserved', 'tibaultObserved', 'earthstriker', 'ambidextrous', 'exploit', 'marshalGlyph', 'warbringer', 'decimatorVuln', 'decimatorOver', 'weaponsMaster', 'skullGem', 'tuskhelmBerserk', 'challenger', 'fists'];

export function charmCounts() {
  const crucibleCharms = 3;
  const sescheronCharms = 2;
  const fists = true;
  const used = crucibleCharms + sescheronCharms + 1;
  return {
    slots: 6,
    rings: 2,
    amulet: 1,
    jewelry: 'Each ring is +1 Sescheron and the amulet is +1 Crucible.',
    crucibleCharms,
    sescheronCharms,
    fists,
    crucible5: true,
    sescheron5: true,
    used,
    fits: used <= 6,
    spare: 6 - used,
    seal: 'Talisman_Seal_MythicUnique_03 sets Talisman_Charm_Slot_Count_Base to 6. Affix Talisman_SealAffix_Ancestral_03 sets Set_Item_Discount to 1. The string says the charm requirement drops by 1, with a minimum of 2.'
  };
}

export function scoreProposedDoubleSwing(catalog, savedBuild, opts = {}) {
  const split = 'ds-s16-proposed';
  const counts = charmCounts();
  const base = S16_DEFINITIONS.find(item => item.id === 's16-double-swing');
  const lines = opts.skipRamaladni ? PROPOSED_LINES.filter(id => id !== 'ramaladniObserved') : [...PROPOSED_LINES];
  if (opts.amulet !== 'crushing') lines.push('selig');
  if (opts.amulet === 'crushing' || opts.rings === 'crushing' || (opts.rings == null && opts.amulet === 'crushing')) lines.push('crushingMid');
  if (opts.rings === 'edgemaster' || opts.rings == null) lines.push(opts.edgemasterFull === false ? 'edgemasterHalf' : 'edgemaster');
  if (counts.sescheron5) lines.push('sescheron');
  else lines.push('sescheronPartial');
  if (counts.crucible5) lines.push('crucibleStreak');
  if (opts.grandfather) lines.push('grandfatherCrit');
  if (!counts.fists) {
    const index = lines.indexOf('fists');
    if (index >= 0) lines.splice(index, 1);
  }
  const skills = opts.skipWrath
    ? base.timelineSkills.filter(id => id !== 'wrath-of-the-berserker')
    : base.timelineSkills;
  const definition = { ...base, fury: 605, scoredLines: lines, timelineSkills: skills };
  const scored = scoreS16Build(catalog, savedBuild, definition, {
    variants: { sliceAndDice: true },
    dustDevilGlyph: false,
    alwaysBerserk: opts.alwaysBerserk === true,
    holdBuffs: opts.holdWrath ? ['wrath-of-the-berserker'] : undefined,
    cdrPct: opts.cdrPct,
    shoutCutSeconds: opts.shoutCutSeconds,
    skillTiming: opts.skillTiming
  });
  return { ...scored, id: 'ds-s16-proposed', split, counts, ...withCastRates(scored) };
}

export const FILE_SHOUT_TIMING = {
  'war-cry': { cooldown: 25, duration: 4 },
  'challenging-shout': { cooldown: 25, duration: 8 },
  'wrath-of-the-berserker': { cooldown: 90, duration: 16 }
};

export function blendWrathUptime(onAverage, offAverage, uptime) {
  return uptime * onAverage + (1 - uptime) * offAverage;
}

export function proposedWrathBlend(catalog, savedBuild) {
  const gear = { amulet: 'crushing', rings: 'edgemaster' };
  const timing = { skillTiming: FILE_SHOUT_TIMING, cdrPct: 9, shoutCutSeconds: 2 };
  const headline = scoreProposedDoubleSwing(catalog, savedBuild, gear);
  const timed = scoreProposedDoubleSwing(catalog, savedBuild, { ...gear, ...timing });
  const window = scoreProposedDoubleSwing(catalog, savedBuild, { ...gear, ...timing, holdWrath: true, alwaysBerserk: true });
  const outside = scoreProposedDoubleSwing(catalog, savedBuild, { ...gear, ...timing, skipWrath: true, alwaysBerserk: true });
  const on = window.dpsAtSheet.max.average;
  const off = outside.dpsAtSheet.max.average;
  const cycle = simulateBuffRotation([
    { id: 'war-cry', name: 'War Cry', duration: 4, cooldown: 25, isShout: true, simulated: true, lines: [] },
    { id: 'challenging-shout', name: 'Challenging Shout', duration: 8, cooldown: 25, isShout: true, simulated: true, lines: [] },
    { id: 'wrath-of-the-berserker', name: 'Wrath of the Berserker', duration: 16, cooldown: 90, isShout: false, simulated: true, lines: [] }
  ], { cdrPct: 9, shoutCutSeconds: 2, horizon: 400 });
  const wrath = cycle.buffs.find(buff => buff.id === 'wrath-of-the-berserker');
  const gap = wrath.casts[1] - wrath.casts[0];
  const uptime = Math.min(1, wrath.duration / gap);
  const at = (value) => blendWrathUptime(on, off, value);
  return {
    headline: headline.dpsAtSheet.max.average,
    headlineAssumesFullWrath: headline.wrathAtSheet.uptime >= 1 - 1e-9,
    headlineUptime: headline.wrathAtSheet.uptime,
    headlineOn: headline.wrathAtSheet.on.average,
    headlineOff: headline.wrathAtSheet.off?.average ?? null,
    window: on,
    outside: off,
    gap,
    uptime,
    openingMinuteUptime: timed.wrathAtSheet.uptime,
    realistic: at(uptime),
    table: [1, 0.9, 0.75, 0.5, uptime].map(value => ({ uptime: value, average: at(value) })),
    twinStrikesKeepsBerserk: true,
    estimate: 'Twin Strikes grants Berserking for 3 seconds on the later sweep. At 1.2375 casts per second that covers the gap, so the Crucible streak stays up outside Wrath. War Cry is 4 seconds and does not bridge its cooldown. Marshal\'s 2 second cut and the refresh are estimates.'
  };
}

export const SWORD_WEAPON_APS = 1.1;
export const NON_GEAR_ATTACK_SPEED = 12.5;

export function doubleSwingCastRate(attackSpeedPct) {
  return SWORD_WEAPON_APS * (1 + attackSpeedPct / 100);
}

function scaleDps(row, factor) {
  return { peak: row.peak * factor, average: row.average * factor };
}

function withCastRates(scored) {
  const capped = doubleSwingCastRate(DEFAULT_ATTACK_SPEED_PCT);
  const sheet = doubleSwingCastRate(NON_GEAR_ATTACK_SPEED);
  const factor = sheet / capped;
  const half = (row) => row ? { peak: row.peak * factor, average: row.average * factor } : null;
  return {
    weaponAps: SWORD_WEAPON_APS,
    nonGearAttackSpeed: NON_GEAR_ATTACK_SPEED,
    castsPerSecond: { capped, sheet },
    dpsAtSheet: {
      min: scaleDps(scored.dps.min, factor),
      max: scaleDps(scored.dps.max, factor)
    },
    wrathAtSheet: scored.wrathSplit ? {
      uptime: scored.wrathSplit.uptime,
      on: half(scored.wrathSplit.on),
      off: half(scored.wrathSplit.off)
    } : null
  };
}

export const STRIPPED_FURY = { max: 555, regen: 12, generationPct: 30, onKill: 11, cdr: 9 };
const SESCHERON_MAX_FURY = 50;

export function proposedFuryBalance(castRate, opts = {}) {
  const maxFury = STRIPPED_FURY.max + (opts.sescheron === false ? 0 : SESCHERON_MAX_FURY);
  const drain = opts.ramaladni === false ? 0 : (7 / 100) * maxFury;
  const regen = opts.regen ?? STRIPPED_FURY.regen;
  const cost = (opts.furyCost ?? 20) * castRate;
  const critChance = opts.critChance ?? 0.278;
  const perCrit = opts.scaleGeneration ? 3 * (1 + STRIPPED_FURY.generationPct / 100) : 3;
  const critFury = perCrit * (2 * (1 + HIT_TWICE_CHANCE)) * castRate * critChance;
  const crucibleRegen = opts.after10s ? 10 : 0;
  const costFactor = opts.after5s ? 0.7 : 1;
  const tibault = opts.tibault ?? 0;
  const net = regen + crucibleRegen + critFury + tibault - drain - cost * costFactor;
  return { maxFury, drain, regen, cost: cost * costFactor, critFury, net, secondsToEmpty: net >= 0 ? Infinity : maxFury / -net };
}

export function attackSpeedMarginal(dpsAtCapAverage) {
  const perCast = dpsAtCapAverage / doubleSwingCastRate(DEFAULT_ATTACK_SPEED_PCT);
  const step = 10;
  const gain = perCast * doubleSwingCastRate(step) - perCast * doubleSwingCastRate(0);
  return {
    from: NON_GEAR_ATTACK_SPEED,
    to: DEFAULT_ATTACK_SPEED_PCT,
    perTen: gain,
    linear: true,
    castsPerTen: SWORD_WEAPON_APS * (step / 100)
  };
}

export function scoreGoldenEpiphany(catalog, savedBuild, opts = {}) {
  const aspects = opts.jewelryAspects !== false;
  const base = S16_DEFINITIONS.find(item => item.id === 's16-double-swing');
  const lines = PROPOSED_LINES.filter(id => id !== 'fists').concat(['fists', 'nomad', 'bloodMad', 'crucibleStreak']);
  if (aspects) lines.push('crushingMid', 'edgemaster');
  const definition = { ...base, fury: STRIPPED_FURY.max, scoredLines: lines };
  const scored = scoreS16Build(catalog, savedBuild, definition, {
    variants: { sliceAndDice: true },
    dustDevilGlyph: false,
    alwaysBerserk: true
  });
  const furyCost = 20 * 1.25;
  const casts = withCastRates(scored).castsPerSecond;
  const drain = (7 / 100) * DS_FURY;
  const furyAt = (castRate, regen) => {
    const cost = furyCost * castRate;
    const critFury = 3 * (2 * (1 + HIT_TWICE_CHANCE)) * castRate;
    return {
      regen,
      costPerSecond: cost,
      drain,
      critFury,
      net: regen - drain - cost,
      netWithCritAndUnstoppable: regen - drain - cost + critFury + 25
    };
  };
  return {
    ...scored,
    id: 'ds-s16-golden-epiphany',
    jewelryAspects: aspects,
    setCount: { jewelry: 3, charms: 3, total: 6, capInFiles: 5, wasted: 1 },
    ...withCastRates(scored),
    furyAtCap: { sheetRegen: furyAt(casts.capped, 80), withoutInsight: furyAt(casts.capped, 33) },
    furyAtSheet: { sheetRegen: furyAt(casts.sheet, 80), withoutInsight: furyAt(casts.sheet, 33) }
  };
}

export function formatBillions(total) {
  return billions(total);
}

export { LINES };
