import { compute, marginal } from './engine.js';

export const ENTITY_KEYS = {
  skill: 'skills',
  skillVariant: 'skillVariants',
  expertise: 'expertise',
  aspect: 'aspects',
  unique: 'uniques',
  affix: 'affixes',
  paragonBoard: 'paragonBoards',
  paragonNode: 'paragonNodes',
  glyph: 'glyphs',
  talisman: 'talismans',
  seasonalMechanic: 'seasonalMechanics'
};

export const SEARCH_BUCKETS = ['additive', 'multiplicative', 'crit', 'vuln', 'overpower'];

export function pointValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function knownBucket(bucket) {
  return SEARCH_BUCKETS.includes(bucket) ? bucket : null;
}

export function slotIds(catalog) {
  return catalog.constraints.gearSlots.map(slot => slot.id);
}

export function blankDefense() {
  return { life: null, armor: null, resists: null, armorMitigationPct: null, resistMitigationPct: null, dr: null };
}

export function blankUptime() {
  return { berserk: null, vulnerable: null, overpower: null };
}

export function emptyGear(catalog) {
  return slotIds(catalog).map(slotId => ({ slotId, affixes: [], aspectId: null, uniqueId: null }));
}

export function blankBuild(catalog, patch = {}) {
  return {
    id: patch.id || 'build',
    name: patch.name || 'Build',
    class: catalog.meta.class,
    skills: [],
    variants: [],
    gear: emptyGear(catalog),
    boards: [],
    glyphs: [],
    talismans: [],
    rotation: [],
    uptime: blankUptime(),
    defense: blankDefense(),
    weaponDmg: null,
    mainStat: null,
    critChance: null,
    critDmg: null,
    vulnPct: null,
    overpowerPct: null,
    ...patch,
    gear: patch.gear || emptyGear(catalog),
    uptime: { ...blankUptime(), ...(patch.uptime || {}) },
    defense: { ...blankDefense(), ...(patch.defense || {}) }
  };
}

export function legacyEntity(entity, group) {
  const effect = (entity.effects || [])[0] || {};
  const range = Array.isArray(effect.value) ? effect.value : [null, null];
  return {
    ...entity,
    group,
    value: pointValue(effect.value),
    min: range[0] ?? null,
    max: range[1] ?? null,
    bucket: effect.bucket ?? null,
    source: entity.source || effect.source || 'manual-entry',
    verified: Object.prototype.hasOwnProperty.call(effect, 'verified') ? effect.verified === true : entity.verified === true,
    note: entity.note || effect.note || ''
  };
}

export function entityTemplate(type) {
  const base = { id: '', name: '', source: 'manual-entry', verified: false };
  const effect = {
    stat: null,
    bucket: null,
    value: null,
    conditions: null,
    stacking: null,
    source: 'manual-entry',
    verified: false
  };
  if (type === 'skill') {
    return {
      ...base,
      category: null,
      tags: [],
      coeffPct: null,
      rank: null,
      dot: null,
      furyGeneratePerCast: null,
      furySpendPerCast: null,
      variantOf: null,
      allocated: null,
      effects: [{ ...effect, stat: 'coefficient' }]
    };
  }
  if (type === 'skillVariant') return { ...base, skillId: null, effects: [] };
  if (type === 'aspect' || type === 'unique') return { ...base, slots: null, effects: [{ ...effect }] };
  if (type === 'affix') return { ...base, slot: null, effects: [{ ...effect }] };
  if (type === 'paragonBoard') return { ...base, name: null, nodeIds: [] };
  if (type === 'paragonNode') return { ...base, boardId: null, effects: [{ ...effect }] };
  if (type === 'glyph') return { ...base, level: null, effects: [{ ...effect }] };
  return { ...base, name: null, effects: [] };
}

export function upsertEntity(catalog, key, entity) {
  const list = catalog[key];
  if (!Array.isArray(list)) throw new Error(`Unknown catalog collection ${key}`);
  const index = list.findIndex(item => item.id === entity.id);
  if (index >= 0) list[index] = entity;
  else list.push(entity);
  return catalog;
}

function skillById(catalog, id) {
  return catalog.skills.find(skill => skill.id === id) || null;
}

function conditionState(effect, build, catalog) {
  if (effect.conditions == null) return 'unknown';
  if (effect.conditions.length === 0) return 'active';
  const tags = new Set();
  for (const id of build.skills || []) {
    for (const tag of skillById(catalog, id)?.tags || []) tags.add(String(tag).toLowerCase().replace(/\?$/, ''));
  }
  for (const raw of effect.conditions) {
    const text = String(raw).toLowerCase();
    if (text.includes('?')) return 'unknown';
    if (text.includes('berserk')) {
      if (typeof build.uptime?.berserk !== 'number') return 'unknown';
      if (build.uptime.berserk <= 0) return 'inactive';
    } else if (text.includes('vulnerable')) {
      if (typeof build.uptime?.vulnerable !== 'number') return 'unknown';
      if (build.uptime.vulnerable <= 0) return 'inactive';
    } else if (text.includes('overpower')) {
      if (typeof build.uptime?.overpower !== 'number') return 'unknown';
      if (build.uptime.overpower <= 0) return 'inactive';
    } else if (!tags.has(text.replace(/\?$/, ''))) {
      return 'inactive';
    }
  }
  return 'active';
}

export function damageEffects(entity, build, catalog) {
  const active = [];
  for (const effect of entity.effects || []) {
    const value = pointValue(effect.value);
    const bucket = knownBucket(effect.bucket);
    if (value == null || !bucket) continue;
    const state = build ? conditionState(effect, build, catalog) : (effect.conditions && effect.conditions.length === 0 ? 'active' : 'unknown');
    if (state === 'inactive') continue;
    active.push({ effect, value, bucket, state });
  }
  return active;
}

export function engineInputFromBuild(catalog, build, opts = {}) {
  const skills = (build.skills || []).map(id => skillById(catalog, id)).filter(Boolean);
  const coeffPct = skills.length === 1 ? skills[0].coeffPct : null;
  const dotKnown = skills.length > 0 && skills.every(skill => skill.dot === true || skill.dot === false);
  const isDot = dotKnown ? skills.every(skill => skill.dot === true) : false;
  const uptime = build.uptime || blankUptime();
  const vulnerable = typeof uptime.vulnerable === 'number' && uptime.vulnerable > 0;
  const overpower = typeof uptime.overpower === 'number' && uptime.overpower > 0;
  const modifiers = [];
  const notes = [];
  if (skills.length > 1) notes.push('Multiple skills are not summed into one coefficient. Power uses no coeff until a single core skill is selected.');
  if (!dotKnown) notes.push('DoT flag is unknown for a selected skill. Crit was not removed.');
  for (const slot of build.gear || []) {
    for (const ref of [['aspect', slot.aspectId, catalog.aspects], ['unique', slot.uniqueId, catalog.uniques]]) {
      const [kind, id, list] = ref;
      if (!id) continue;
      const entity = (list || []).find(item => item.id === id);
      if (!entity) continue;
      for (const piece of damageEffects(entity, build, catalog)) {
        if (piece.state === 'unknown') {
          notes.push(`${entity.name}: condition unknown, damage effect not applied.`);
          continue;
        }
        modifiers.push({ name: `${entity.name} (${slot.slotId})`, bucket: piece.bucket, value: piece.value, active: true, kind, id: entity.id });
      }
    }
  }
  const mainStatPer10 = catalog.mainstat?.verified === true ? catalog.mainstat.percentPer10 : null;
  return {
    weaponDmg: build.weaponDmg,
    coeffPct,
    mainStat: build.mainStat,
    mainStatPer10,
    critChance: build.critChance,
    critDmg: build.critDmg,
    vulnerable,
    vulnPct: build.vulnPct,
    overpower,
    overpowerPct: build.overpowerPct,
    isDot,
    modifiers,
    notes
  };
}

export function evaluateBuild(catalog, build, opts = {}) {
  const input = engineInputFromBuild(catalog, build, opts);
  const uptime = build.uptime || blankUptime();
  const flags = [];
  if (typeof uptime.vulnerable === 'number') flags.push(['vulnerable', uptime.vulnerable]);
  if (typeof uptime.overpower === 'number') flags.push(['overpower', uptime.overpower]);
  if (!flags.length) return { input, result: compute(input), marginal: marginal(input) };
  let states = [{ patch: {}, weight: 1 }];
  for (const [key, raw] of flags) {
    const on = Math.min(1, Math.max(0, raw));
    const next = [];
    for (const state of states) {
      next.push({ patch: { ...state.patch, [key]: false }, weight: state.weight * (1 - on) });
      next.push({ patch: { ...state.patch, [key]: true }, weight: state.weight * on });
    }
    states = next;
  }
  let total = 0;
  let shown = null;
  for (const state of states) {
    const result = compute({ ...input, ...state.patch });
    total += result.total * state.weight;
    if (!shown || state.weight >= shown.weight) shown = { result, weight: state.weight };
  }
  const result = {
    ...shown.result,
    total,
    terms: [...shown.result.terms, { label: 'Uptime blend', value: total, expr: 'expected value across Vulnerable and Overpower uptime' }]
  };
  return { input, result, marginal: marginal(input) };
}

export function verificationFields(catalog, build, opts = {}) {
  const fields = [];
  const push = (path, ok) => fields.push({ path, ok: !!ok });
  for (const id of build.skills || []) {
    const skill = skillById(catalog, id);
    push(`skills/${id}/verified`, skill?.verified === true);
    push(`skills/${id}/coeffPct`, typeof skill?.coeffPct === 'number');
    push(`skills/${id}/dot`, skill?.dot === true || skill?.dot === false);
    push(`skills/${id}/rank`, typeof skill?.rank === 'number');
    push(`skills/${id}/furyGeneratePerCast`, typeof skill?.furyGeneratePerCast === 'number');
    push(`skills/${id}/furySpendPerCast`, typeof skill?.furySpendPerCast === 'number');
  }
  for (const slot of build.gear || []) {
    for (const [kind, id, list] of [['aspect', slot.aspectId, catalog.aspects], ['unique', slot.uniqueId, catalog.uniques]]) {
      if (!id) continue;
      const entity = (list || []).find(item => item.id === id);
      push(`${kind}/${id}/verified`, entity?.verified === true);
      push(`${kind}/${id}/slots`, Array.isArray(entity?.slots));
      for (const [index, effect] of (entity?.effects || []).entries()) {
        if (!knownBucket(effect.bucket) && pointValue(effect.value) == null) continue;
        const base = `${kind}/${id}/effects/${index}`;
        push(`${base}/value`, typeof effect.value === 'number');
        push(`${base}/verified`, effect.verified === true);
        push(`${base}/bucket`, !!knownBucket(effect.bucket));
        push(`${base}/conditions`, Array.isArray(effect.conditions));
        push(`${base}/stacking`, typeof effect.stacking === 'string' && effect.stacking.length > 0);
      }
    }
  }
  const manual = opts.manualInputsVerified === true;
  for (const key of ['weaponDmg', 'mainStat', 'critChance', 'critDmg']) {
    push(`input/${key}`, typeof build[key] === 'number' && manual);
  }
  return fields;
}

export function unverifiedShare(catalog, build, opts = {}) {
  const fields = verificationFields(catalog, build, opts);
  if (!fields.length) return 0;
  return fields.filter(field => !field.ok).length / fields.length;
}

export function buildKeys(build) {
  const aspects = [];
  const uniques = [];
  for (const slot of build.gear || []) {
    if (slot.aspectId) aspects.push(slot.aspectId);
    if (slot.uniqueId) uniques.push(slot.uniqueId);
  }
  return { skills: [...(build.skills || [])], aspects, uniques, keyItems: [...aspects, ...uniques] };
}
