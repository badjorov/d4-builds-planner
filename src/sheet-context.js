// Town and combat are two readings of the same sheet stat.
// sheetContext selects one. A missing combat number uses the town number
// and is recorded as a fallback. A bare number is a town reading, so
// fixtures and the optimizer form keep working.

const SCALAR_FIELDS = [
  ['weaponDmg', 'Weapon Damage'],
  ['mainStat', 'Strength'],
  ['critChance', 'Critical Strike Chance'],
  ['critDmg', 'Critical Strike Damage'],
  ['additivePct', 'All Damage'],
  ['vulnPct', 'Vulnerable Damage'],
  ['maxFury', 'Max Fury'],
  ['furyRegeneration', 'Fury regeneration'],
  ['furyGenerationPct', 'Fury generation'],
  ['furyCostReductionPct', 'Fury cost reduction'],
  ['furyOnKill', 'Fury on kill']
];

const OFFENSIVE_FIELDS = [
  ['allDamage', 'All Damage'],
  ['allDamageItemsAndParagon', 'All Damage from items and Paragon'],
  ['vulnerable', 'Vulnerable Damage'],
  ['physical', 'Damage with Physical'],
  ['fire', 'Damage with Fire'],
  ['lightning', 'Damage with Lightning'],
  ['cold', 'Damage with Cold'],
  ['holy', 'Damage with Holy'],
  ['poison', 'Damage with Poison'],
  ['shadow', 'Damage with Shadow'],
  ['vsElites', 'vs Elites'],
  ['vsHealthy', 'vs Healthy'],
  ['vsInjured', 'vs Injured'],
  ['whileHealthy', 'while you are Healthy'],
  ['whileFortified', 'while Fortified'],
  ['thorns', 'Thorns']
];

const DEFENSE_FIELDS = [
  ['life', 'Life'],
  ['armor', 'Armor'],
  ['resists', 'Resistances'],
  ['armorMitigationPct', 'Armor mitigation'],
  ['resistMitigationPct', 'Resist mitigation']
];

const COLD_FIELDS = [
  ['gear', 'Cold resistance from gear'],
  ['intelligence', 'Cold resistance from Intelligence'],
  ['other', 'Cold resistance, other']
];

export function sheetContextOf(build, opts = {}) {
  const raw = opts.sheetContext ?? build?.sheetContext;
  return raw === 'combat' ? 'combat' : 'town';
}

export function isSheetReading(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    && (Object.hasOwn(value, 'town') || Object.hasOwn(value, 'combat'));
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function resolveReading(value, context) {
  if (!isSheetReading(value)) {
    const number = finite(value);
    if (number == null) return { value: null, source: 'missing', fallback: false };
    if (context === 'combat') return { value: number, source: 'town', fallback: true };
    return { value: number, source: 'town', fallback: false };
  }
  const town = finite(value.town);
  const combat = finite(value.combat);
  if (context === 'combat') {
    if (combat != null) return { value: combat, source: 'combat', fallback: false };
    if (town != null) return { value: town, source: 'town', fallback: true };
    return { value: null, source: 'missing', fallback: false };
  }
  if (town == null) return { value: null, source: 'missing', fallback: false };
  return { value: town, source: 'town', fallback: false };
}

function take(build, field, label, context, fallbacks) {
  const reading = resolveReading(build?.[field], context);
  if (reading.fallback && reading.value != null) fallbacks.push({ field, label, town: reading.value });
  return reading.value;
}

function takeGroup(source, fields, prefix, context, fallbacks) {
  const next = { ...source };
  for (const [field, label] of fields) {
    if (!Object.hasOwn(source, field)) continue;
    const reading = resolveReading(source[field], context);
    if (reading.fallback && reading.value != null) {
      fallbacks.push({ field: prefix ? `${prefix}.${field}` : field, label, town: reading.value });
    }
    next[field] = reading.value;
  }
  return next;
}

export function applySheetContext(build, context = sheetContextOf(build)) {
  const source = build || {};
  const fallbacks = [];
  const next = { ...source };
  for (const [field, label] of SCALAR_FIELDS) {
    if (!Object.hasOwn(source, field)) continue;
    next[field] = take(source, field, label, context, fallbacks);
  }
  if (source.offensiveSheet) {
    next.offensiveSheet = takeGroup(source.offensiveSheet, OFFENSIVE_FIELDS, 'offensiveSheet', context, fallbacks);
  }
  if (source.defense) {
    next.defense = takeGroup(source.defense, DEFENSE_FIELDS, 'defense', context, fallbacks);
    if (source.defense.coldResistance) {
      next.defense.coldResistance = takeGroup(source.defense.coldResistance, COLD_FIELDS, 'defense.coldResistance', context, fallbacks);
    }
  }
  const current = resolveReading(source.currentFury, context);
  const maxFury = finite(next.maxFury);
  let currentFuryEstimate = false;
  if (current.value != null && !current.fallback) {
    next.currentFury = current.value;
  } else if (current.value != null && current.fallback) {
    next.currentFury = current.value;
    fallbacks.push({ field: 'currentFury', label: 'Current Fury', town: current.value });
  } else if (maxFury != null) {
    next.currentFury = maxFury;
    currentFuryEstimate = true;
  } else {
    next.currentFury = null;
  }
  next.currentFuryEstimate = currentFuryEstimate;
  return { build: next, context, fallbacks, currentFuryEstimate };
}
