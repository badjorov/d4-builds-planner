import { rotationReport } from './rotation.js';

const FURY = 826;
const FURY_NOTE = 'Combat Fury 826 is Nikolay\'s observed combat-allbuff reading. These builds do not store their own Fury. Using 826 is an estimate.';

// PTR skill formulas. Table(34, rank) is not in the checkout, so the score uses the
// constant at a table value of 1. That is the number the patch text calls 150% per swing.
export const PTR_COEFFICIENTS = {
  'double-swing': {
    stored: 114,
    ptr: 150,
    formula: 'SF_0 = 1.5 * Table(34, sLevel). Payload 0 uses SF_0. SF_1 is 1.5.',
    perSwing: true
  },
  whirlwind: {
    stored: 386,
    ptr: 165,
    formula: 'SF_0 = 1.65 * Table(34, sLevel). The score uses 165%, the constant at table value 1.'
  },
  flay: {
    storedDirect: 15,
    storedBleed: 45,
    storedDuration: 5,
    ptrDirect: 5.5,
    ptrBleed: 115,
    ptrDuration: 5,
    formula: 'Power Barbarian_Maim is named Flay. Direct SF_1 is 0.055. Bleed total SF_5 is 1.15 * Table(34, sLevel). Duration SF_7 is 5. The dot scalar SF_6 is that total divided by 5.'
  }
};

const LINES = {
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
    min: 15,
    max: 35,
    when: 'overpower',
    label: '14+legendary rank %[x] Overpower. Rank 1 is 15. Rank 21 is 35. Unverified.'
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
  }
};

function percent(spec, end) {
  const roll = end === 'min' ? spec.min : spec.max;
  return spec.perFury ? roll * FURY : roll;
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

function modifiersFor(specs, end, slice, info) {
  const lines = [];
  for (const spec of specs) {
    if (!lineOn(spec, slice, info)) continue;
    const roll = percent(spec, end);
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
    timelineSkills: ['double-swing', 'war-cry', 'rallying-cry', 'challenging-shout', 'wrath-of-the-berserker'],
    hitSkill: 'whirlwind',
    storedCoeff: 114,
    ptrCoeff: 150,
    coeffRatio: 150 / 386,
    noOverpower: false,
    fistsOfFate: true,
    scoredLines: ['ramaladni', 'tibault', 'earthstriker', 'crushing', 'redFuror', 'fists', 'sescheron', 'cruciblePlus', 'crucibleStreak'],
    coeffNote: 'Stored Double Swing coefficient 114%. PTR payload is 1.5 × Table(34, rank), and SF_1 is 1.5, which is the 150% per swing in the patch text. The rank table is not in the checkout, so the score uses 150% for one swing. A second swing is not added.'
  },
  {
    id: 's16-whirlwind',
    name: 'Whirlwind',
    timelineSkills: ['whirlwind', 'rallying-cry', 'challenging-shout', 'iron-skin', 'war-cry', 'wrath-of-the-berserker'],
    hitSkill: 'whirlwind',
    storedCoeff: 386,
    ptrCoeff: 165,
    coeffRatio: 165 / 386,
    noOverpower: false,
    scoredLines: ['ramaladni', 'sescheron', 'cruciblePlus', 'crucibleStreak'],
    coeffNote: 'Stored Whirlwind coefficient 386% is the rank 41 screenshot. PTR SF_0 is 1.65 × Table(34, rank). The rank table is not in the checkout, so the score uses 165%.'
  },
  {
    id: 's16-flay',
    name: 'Flay',
    timelineSkills: ['flay', 'rupture', 'war-cry', 'challenging-shout', 'rallying-cry', 'wrath-of-the-berserker'],
    hitSkill: 'flay',
    storedCoeff: 45,
    ptrCoeff: 115,
    coeffRatio: 115 / 15,
    noOverpower: true,
    dot: true,
    scoredLines: ['ramaladni', 'tibault', 'verathiel', 'hooves', 'moonrise', 'bloodletterBleed'],
    coeffNote: 'Flay is Power Barbarian_Maim. Stored tooltip bleed is 45% over 5 seconds. PTR bleed total is 1.15 × Table(34, rank), duration 5. The score uses 115% as one damage-over-time application. Crit is off. The bleed dot has no overpower term, so Overpower is off. The 5.5% direct hit is not added.'
  }
];

function activeLines(definition, opts) {
  return definition.scoredLines
    .filter(id => id !== 'fists' || (definition.fistsOfFate && opts.fistsOfFate !== false))
    .map(id => LINES[id]);
}

function runReport(catalog, build, definition, specs, end) {
  return rotationReport(catalog, build, {
    souls: 0,
    hitSkill: definition.hitSkill,
    noOverpower: definition.noOverpower === true,
    extraModifiersFor: (slice, info) => modifiersFor(specs, end, slice, info)
  });
}

export function scoreS16Build(catalog, savedBuild, definition, opts = {}) {
  const build = bareBuild(savedBuild, definition.timelineSkills);
  const specs = activeLines(definition, opts);
  const min = runReport(catalog, build, definition, specs, 'min');
  const max = runReport(catalog, build, definition, specs, 'max');
  const scale = definition.coeffRatio;
  const withoutSets = specs.filter(spec => !spec.name.includes('Fury') && !spec.name.includes('Crucible') && !spec.name.includes('Bloodletter'));
  const base = runReport(catalog, build, definition, withoutSets, 'max');
  const isolation = [];
  for (const spec of specs.filter(item => /Fury|Crucible|Bloodletter/.test(item.name))) {
    const alone = runReport(catalog, build, definition, [...withoutSets, spec], 'max');
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
    fury: FURY,
    storedCoeff: definition.storedCoeff,
    ptrCoeff: definition.ptrCoeff,
    dot: definition.dot === true,
    coeffNote: definition.coeffNote,
    furyNote: FURY_NOTE,
    min: { peak: min.peak.total * scale, average: min.average.total * scale },
    max: { peak: max.peak.total * scale, average: max.average.total * scale },
    isolation,
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

export function formatBillions(total) {
  return billions(total);
}

export { LINES };
