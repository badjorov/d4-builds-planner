import { rotationReport } from './rotation.js';

const FURY_NOTE = 'Combat Fury 826 is Nikolay\'s observed combat-allbuff reading. These builds do not store their own Fury. Using 826 is an estimate.';

const LINES = {
  ramaladni: {
    name: "Ramaladni's Magnum Opus",
    id: '1HSword_Unique_Barb_101',
    bucket: 'multiplicative',
    min: 0.35,
    max: 0.5,
    perFury: true,
    always: true,
    label: '0.35–0.50%[x] per Fury'
  },
  tibault: {
    name: "Tibault's Will",
    id: 'Pants_Unique_Generic_102',
    bucket: 'multiplicative',
    min: 15,
    max: 20,
    when: 'unstoppable',
    label: '15–20%[x] while Unstoppable'
  },
  earthstriker: {
    name: "Earthstriker's",
    id: 'legendary_barb_104',
    bucket: 'multiplicative',
    min: 15,
    max: 35,
    when: 'overpower',
    label: '14+legendary rank %[x] Overpower. Rank 1 is 15. Rank 21 is 35. That rank reading is unverified.'
  },
  crushing: {
    name: 'Crushing',
    id: 'legendary_druid_049_x2',
    bucket: 'multiplicative',
    min: 45,
    max: 65,
    always: true,
    label: '45%[x] at legendary rank 1, 65%[x] at rank 21, while Fortified. Rank scaling is unverified. Fortified is on for the whole timeline.'
  },
  redFuror: {
    name: 'Ring of Red Furor',
    id: 'Ring_Unique_Barb_100',
    bucket: 'multiplicative',
    min: 50,
    max: 60,
    peakOnly: true,
    label: '50–60%[x] on the next non-channeled Core or Weapon Mastery cast. Uptime is not stored, so the peak includes it and the average leaves it off.'
  },
  verathiel: {
    name: 'Shard of Verathiel',
    id: 'S05_BSK_Generic_004',
    bucket: 'multiplicative',
    min: 70,
    max: 100,
    always: true,
    label: '70–100%[x] Basic Skill damage. Format x%.'
  },
  hooves: {
    name: 'Hooves of the Mountain God',
    id: 'Boots_Unique_Barb_101',
    bucket: 'multiplicative',
    min: 45,
    max: 60,
    peakOnly: true,
    label: '45–60%[x] while Fury drains after a Basic Skill at Maximum Fury. That window has no uptime, so the peak includes it and the average leaves it off.'
  },
  moonrise: {
    name: 'of the Moonrise',
    id: 'legendary_generic_120',
    bucket: 'multiplicative',
    min: 60,
    max: 100,
    peakOnly: true,
    label: '60%[x] Basic Skill damage at legendary rank 1. Rank 21 is 100%[x]. The formula is 60+(rank-1)*2. Rank scaling is unverified. Bloodrage uptime is not stored, so the peak includes it and the average leaves it off.'
  }
};

function furyOf(build) {
  const reading = build?.currentFury;
  if (reading && typeof reading['combat-allbuff'] === 'number') return reading['combat-allbuff'];
  return null;
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

function percent(spec, end, fury) {
  const roll = end === 'min' ? spec.min : spec.max;
  return spec.perFury ? roll * fury : roll;
}

function modifiersFor(specs, end, slice, info, fury) {
  const lines = [];
  for (const spec of specs) {
    if (spec.peakOnly && !info.peak) continue;
    if (spec.when === 'unstoppable' && slice.unstoppable !== 1) continue;
    if (spec.when === 'overpower' && slice.overpower !== 1) continue;
    lines.push({
      id: spec.id,
      name: spec.name,
      bucket: spec.bucket,
      value: percent(spec, end, fury),
      active: true,
      kind: 'unique',
      estimate: true
    });
  }
  return lines;
}

function billions(total) {
  const rounded = Math.round(total / 1e7) / 100;
  const [whole, frac] = rounded.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}B`;
}

export function scoreS16Build(catalog, savedBuild, definition) {
  const fury = furyOf(savedBuild);
  const build = bareBuild(savedBuild, definition.timelineSkills);
  const specs = definition.scoredLines.map(id => LINES[id]);
  const run = (end) => rotationReport(catalog, build, {
    souls: 0,
    extraModifiersFor: (slice, info) => modifiersFor(specs, end, slice, info, fury)
  });
  const min = run('min');
  const max = run('max');
  const scale = definition.coeffRatio;
  return {
    id: definition.id,
    fury,
    coeffRatio: scale,
    min: {
      peak: min.peak.total * scale,
      average: min.average.total * scale
    },
    max: {
      peak: max.peak.total * scale,
      average: max.average.total * scale
    },
    lines: specs.map(spec => ({
      name: spec.name,
      bucket: spec.bucket === 'multiplicative' ? '[x]' : '[+]',
      min: spec.min,
      max: spec.max,
      label: spec.label
    }))
  };
}

export const S16_DEFINITIONS = [
  {
    id: 's16-double-swing',
    name: 'Double Swing',
    timelineSkills: ['double-swing', 'war-cry', 'rallying-cry', 'challenging-shout', 'wrath-of-the-berserker'],
    scoredLines: ['ramaladni', 'tibault', 'earthstriker', 'crushing', 'redFuror'],
    coeffRatio: 114 / 386,
    coeffNote: 'The hit is scaled from the calibrated Whirlwind coefficient 386% by the stored Double Swing coefficient 114%. Damage type on that skill is unset, so the engine would otherwise drop crit. The PTR note says 75% to 150% per swing and that 150% is not applied. The ratio is an estimate.'
  },
  {
    id: 's16-whirlwind',
    name: 'Whirlwind',
    timelineSkills: ['whirlwind', 'rallying-cry', 'challenging-shout', 'iron-skin', 'war-cry', 'wrath-of-the-berserker'],
    scoredLines: ['ramaladni'],
    coeffRatio: 1,
    coeffNote: 'The hit stays the calibrated Whirlwind coefficient 386%.'
  },
  {
    id: 's16-flay',
    name: 'Flay',
    timelineSkills: ['flay', 'rupture', 'war-cry', 'challenging-shout', 'rallying-cry', 'wrath-of-the-berserker'],
    scoredLines: ['ramaladni', 'tibault', 'verathiel', 'hooves', 'moonrise'],
    coeffRatio: 15 / 386,
    coeffNote: 'The number is the stored 15% direct component scaled from Whirlwind 386%. The bleed over 5 seconds is not a scored component. DoT does not crit, and this stub still carries the Whirlwind crit model. It is not the bleed build\'s damage.'
  }
];

export function scoreS16(catalog, savedBuild) {
  return S16_DEFINITIONS.map(definition => ({
    ...scoreS16Build(catalog, savedBuild, definition),
    coeffNote: definition.coeffNote,
    furyNote: FURY_NOTE
  }));
}

export function formatBillions(total) {
  return billions(total);
}

export { LINES };
