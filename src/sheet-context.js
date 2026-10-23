// Town, combat, combat-nobuff, and combat-allbuff are readings of the same sheet stat.
// sheetContext selects one. A missing combat number uses the town number
// and is recorded as a fallback. combat-allbuff falls back to combat-nobuff
// before town. A bare number is a town reading, so fixtures and the optimizer form keep working.

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
  ['furyOnKill', 'Fury on kill'],
  ['attackSpeed', 'Attack Speed']
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
  ['whileBerserking', 'while Berserking'],
  ['overpowerDamage', 'Overpower Damage'],
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

export const SHEET_CONTEXTS = ['town', 'combat', 'combat-nobuff', 'combat-allbuff'];

const READING_KEYS = ['town', 'combat', 'combat-nobuff', 'combat-allbuff', 'combat-allbuff-high'];

export function sheetContextOf(build, opts = {}) {
  const raw = opts.sheetContext ?? build?.sheetContext;
  return SHEET_CONTEXTS.includes(raw) ? raw : 'town';
}

export function isSheetReading(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    && READING_KEYS.some(key => Object.hasOwn(value, key));
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function found(value, source) {
  return { value, source, fallback: false, from: source };
}

function townFallback(town) {
  return { value: town, source: 'town', fallback: true, from: 'town' };
}

export function resolveReading(value, context, opts = {}) {
  const high = opts.allbuffEndpoint === 'high';
  if (!isSheetReading(value)) {
    const number = finite(value);
    if (number == null) return { value: null, source: 'missing', fallback: false };
    if (context === 'town') return { value: number, source: 'town', fallback: false };
    return townFallback(number);
  }
  const town = finite(value.town);
  if (context === 'combat') {
    const combat = finite(value.combat);
    if (combat != null) return found(combat, 'combat');
    if (town != null) return townFallback(town);
    return { value: null, source: 'missing', fallback: false };
  }
  if (context === 'combat-nobuff') {
    const nobuff = finite(value['combat-nobuff']);
    if (nobuff != null) return found(nobuff, 'combat-nobuff');
    if (town != null) return townFallback(town);
    return { value: null, source: 'missing', fallback: false };
  }
  if (context === 'combat-allbuff') {
    if (high) {
      const ramp = finite(value['combat-allbuff-high']);
      if (ramp != null) return found(ramp, 'combat-allbuff-high');
    }
    const allbuff = finite(value['combat-allbuff']);
    if (allbuff != null) return found(allbuff, 'combat-allbuff');
    const nobuff = finite(value['combat-nobuff']);
    if (nobuff != null) return { value: nobuff, source: 'combat-nobuff', fallback: true, from: 'combat-nobuff' };
    if (town != null) return townFallback(town);
    return { value: null, source: 'missing', fallback: false };
  }
  if (town == null) return { value: null, source: 'missing', fallback: false };
  return { value: town, source: 'town', fallback: false };
}

function pushFallback(fallbacks, field, label, raw, reading) {
  const storedTown = isSheetReading(raw) ? finite(raw.town) : null;
  fallbacks.push({
    field,
    label,
    town: reading.from === 'town' ? reading.value : storedTown,
    from: reading.from || 'town',
    value: reading.value
  });
}

function take(build, field, label, context, opts, fallbacks) {
  const raw = build?.[field];
  const reading = resolveReading(raw, context, opts);
  if (reading.fallback && reading.value != null) pushFallback(fallbacks, field, label, raw, reading);
  return reading.value;
}

function takeGroup(source, fields, prefix, context, opts, fallbacks) {
  const next = { ...source };
  for (const [field, label] of fields) {
    if (!Object.hasOwn(source, field)) continue;
    const reading = resolveReading(source[field], context, opts);
    if (reading.fallback && reading.value != null) {
      pushFallback(fallbacks, prefix ? `${prefix}.${field}` : field, label, source[field], reading);
    }
    next[field] = reading.value;
  }
  return next;
}

export function applySheetContext(build, context = sheetContextOf(build), opts = {}) {
  const source = build || {};
  const fallbacks = [];
  const next = { ...source };
  for (const [field, label] of SCALAR_FIELDS) {
    if (!Object.hasOwn(source, field)) continue;
    next[field] = take(source, field, label, context, opts, fallbacks);
  }
  if (source.offensiveSheet) {
    next.offensiveSheet = takeGroup(source.offensiveSheet, OFFENSIVE_FIELDS, 'offensiveSheet', context, opts, fallbacks);
  }
  if (source.defense) {
    next.defense = takeGroup(source.defense, DEFENSE_FIELDS, 'defense', context, opts, fallbacks);
    if (source.defense.coldResistance) {
      next.defense.coldResistance = takeGroup(source.defense.coldResistance, COLD_FIELDS, 'defense.coldResistance', context, opts, fallbacks);
    }
  }
  const current = resolveReading(source.currentFury, context, opts);
  const maxFury = finite(next.maxFury);
  let currentFuryEstimate = false;
  if (current.value != null && !current.fallback) {
    next.currentFury = current.value;
  } else if (current.value != null && current.fallback) {
    next.currentFury = current.value;
    pushFallback(fallbacks, 'currentFury', 'Current Fury', source.currentFury, current);
  } else if (maxFury != null) {
    next.currentFury = maxFury;
    currentFuryEstimate = true;
  } else {
    next.currentFury = null;
  }
  next.currentFuryEstimate = currentFuryEstimate;
  return { build: next, context, fallbacks, currentFuryEstimate };
}
