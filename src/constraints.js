import { slotIds } from './catalog.js';
import { applySheetContext } from './sheet-context.js';

export function furyBalance(catalog, build) {
  const rotation = build.rotation?.length
    ? build.rotation
    : (build.skills || []).map(skillId => ({ skillId, castsPerSecond: null }));
  if (!rotation.length) {
    return { perSecond: null, generatedPerSecond: null, spentPerSecond: null, unknown: true, reason: 'Rotation is empty.' };
  }
  let generated = 0;
  let spent = 0;
  const gaps = [];
  for (const step of rotation) {
    const skill = catalog.skills.find(item => item.id === step.skillId);
    if (!skill) {
      gaps.push(`Unknown skill ${step.skillId}.`);
      continue;
    }
    if (typeof skill.furyGeneratePerCast !== 'number') gaps.push(`${skill.name}: fury generation per cast is null.`);
    if (typeof skill.furySpendPerCast !== 'number') gaps.push(`${skill.name}: fury spend per cast is null.`);
    if (typeof step.castsPerSecond !== 'number') gaps.push(`${skill.name}: casts per second is null.`);
    if (gaps.length) continue;
    generated += skill.furyGeneratePerCast * step.castsPerSecond;
    spent += skill.furySpendPerCast * step.castsPerSecond;
  }
  if (gaps.length) {
    return { perSecond: null, generatedPerSecond: null, spentPerSecond: null, unknown: true, reason: gaps.join(' ') };
  }
  return { perSecond: generated - spent, generatedPerSecond: generated, spentPerSecond: spent, unknown: false, reason: null };
}

export function effectiveHp(defense) {
  if (!defense) return { ehp: null, taken: null, reason: 'Defense inputs are missing.' };
  if (typeof defense.life !== 'number') return { ehp: null, taken: null, reason: 'Life is null.' };
  if (typeof defense.armorMitigationPct !== 'number') {
    return { ehp: null, taken: null, reason: 'Armor mitigation % is null. Armor rating is not converted; that curve is not in the sourced data.' };
  }
  if (typeof defense.resistMitigationPct !== 'number') {
    return { ehp: null, taken: null, reason: 'Resist mitigation % is null. Resist rating is not converted; that curve is not in the sourced data.' };
  }
  if (!Array.isArray(defense.dr)) return { ehp: null, taken: null, reason: 'Damage-reduction list is null.' };
  if (defense.dr.some(value => typeof value !== 'number')) return { ehp: null, taken: null, reason: 'A damage-reduction term is null.' };
  let taken = (1 - defense.armorMitigationPct / 100) * (1 - defense.resistMitigationPct / 100);
  for (const layer of defense.dr) taken *= (1 - layer / 100);
  if (taken <= 0) return { ehp: Number.POSITIVE_INFINITY, taken, reason: 'Damage taken is 0.' };
  return { ehp: defense.life / taken, taken, reason: null };
}

export function resolveMinimums(catalog, overrides = {}) {
  const base = catalog.constraints?.playability || {};
  return {
    furyPerSecond: pick(overrides.furyPerSecond, overrides.minFuryPerSecond, base.minFuryPerSecond),
    berserk: pick(overrides.berserk, overrides.minBerserkUptime, base.minBerserkUptime),
    vulnerable: pick(overrides.vulnerable, overrides.minVulnerableUptime, base.minVulnerableUptime),
    overpower: pick(overrides.overpower, overrides.minOverpowerUptime, base.minOverpowerUptime),
    ehp: pick(overrides.ehp, overrides.minEhp, base.minEhp)
  };
}

function pick(...values) {
  for (const value of values) if (value !== undefined) return value;
  return null;
}

export function checkBuild(catalog, build, minimums = {}) {
  const mins = resolveMinimums(catalog, minimums || {});
  const violations = [];
  const reject = (code, message, extra = {}) => violations.push({ code, message, severity: 'reject', ...extra });
  const bar = catalog.constraints?.skillBarSize;
  if (typeof bar === 'number' && (build.skills || []).length > bar) {
    reject('skill-bar', `Skill bar allows ${bar}; this build has ${build.skills.length}.`);
  }
  const seenSkills = new Set();
  for (const id of build.skills || []) {
    if (seenSkills.has(id)) reject('duplicate-skill', `Skill ${id} is assigned twice.`);
    seenSkills.add(id);
  }
  const expected = slotIds(catalog);
  const gear = build.gear || [];
  if (gear.length !== expected.length || gear.some((slot, index) => slot.slotId !== expected[index])) {
    reject('gear-slots', `Gear must assign the ${expected.length} catalog slots in order.`);
  }
  const aspects = new Set();
  const uniques = new Set();
  const slotById = new Map((catalog.constraints?.gearSlots || []).map(slot => [slot.id, slot]));
  for (const slot of gear) {
    const def = slotById.get(slot.slotId);
    if (slot.aspectId && slot.uniqueId && catalog.constraints?.oneAspectPerSlot !== false) {
      reject('aspect-and-unique', `${slot.slotId} has both an aspect and a unique.`);
    }
    if (slot.aspectId) {
      if (aspects.has(slot.aspectId)) reject('duplicate-aspect', `Aspect ${slot.aspectId} is equipped more than once.`);
      aspects.add(slot.aspectId);
      if (def && def.acceptsAspect === false) reject('aspect-slot', `${slot.slotId} does not accept an aspect.`);
      const aspect = (catalog.aspects || []).find(item => item.id === slot.aspectId);
      if (!aspect) reject('unknown-aspect', `Aspect ${slot.aspectId} is not in the catalog.`);
      else if (Array.isArray(aspect.slots) && !aspect.slots.includes(slot.slotId)) {
        reject('aspect-slot', `${aspect.name} cannot be placed in ${slot.slotId}.`);
      }
    }
    if (slot.uniqueId) {
      if (uniques.has(slot.uniqueId)) reject('duplicate-unique', `Unique ${slot.uniqueId} is equipped more than once.`);
      uniques.add(slot.uniqueId);
      if (def && def.acceptsUnique === false) reject('unique-slot', `${slot.slotId} does not accept a unique.`);
      const unique = (catalog.uniques || []).find(item => item.id === slot.uniqueId);
      if (!unique) reject('unknown-unique', `Unique ${slot.uniqueId} is not in the catalog.`);
      else if (catalog.constraints?.uniquesFixedToSlots !== false) {
        if (!Array.isArray(unique.slots)) reject('unique-slot-unknown', `${unique.name} has no sourced slot, so the placement is not allowed.`);
        else if (!unique.slots.includes(slot.slotId)) reject('unique-slot', `${unique.name} is fixed to ${unique.slots.join(', ')}, not ${slot.slotId}.`);
      }
    }
  }
  if (typeof mins.furyPerSecond === 'number') {
    const fury = furyBalance(catalog, build);
    if (fury.unknown || fury.perSecond < mins.furyPerSecond) {
      reject('fury-sustain', fury.unknown
        ? `Fury sustain is unknown (${fury.reason}) and the minimum is ${mins.furyPerSecond}/s.`
        : `Fury sustain ${fury.perSecond}/s is below ${mins.furyPerSecond}/s.`, { fury });
    }
  }
  for (const [key, label] of [['berserk', 'Berserk'], ['vulnerable', 'Vulnerable'], ['overpower', 'Overpower']]) {
    if (typeof mins[key] !== 'number') continue;
    const value = build.uptime?.[key];
    if (typeof value !== 'number' || value < mins[key]) {
      reject('uptime', typeof value !== 'number'
        ? `${label} uptime is null and the minimum is ${mins[key]}.`
        : `${label} uptime ${value} is below ${mins[key]}.`, { condition: key, value: value ?? null, min: mins[key] });
    }
  }
  if (typeof mins.ehp === 'number') {
    const hp = effectiveHp(applySheetContext(build).build.defense);
    if (hp.ehp == null || hp.ehp < mins.ehp) {
      reject('ehp', hp.ehp == null
        ? `EHP is unknown (${hp.reason}) and the minimum is ${mins.ehp}.`
        : `EHP ${hp.ehp} is below ${mins.ehp}.`, { ehp: hp.ehp, min: mins.ehp });
    }
  }
  return { ok: violations.length === 0, rejected: violations.length > 0, violations, minimums: mins };
}
