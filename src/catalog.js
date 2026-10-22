import { compute, marginal } from './engine.js';

export const ENTITY_KEYS = {
  skill: 'skills',
  skillVariant: 'skillVariants',
  expertise: 'expertise',
  aspect: 'aspects',
  unique: 'uniques',
  affix: 'affixes',
  gem: 'gems',
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
  if (type === 'gem') return { ...base, level: null, maxLevel: null, effects: [{ ...effect, slotType: null }] };
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

const BLENDED_UPTIMES = new Set(['channeling', 'fortified', 'unstoppable', 'furyAbove50', 'dustDevil', 'elites', 'playerHealthy']);
const STATE_UPTIMES = new Set(['berserk', 'vulnerable', 'overpower', 'healthyInjured']);

function singleSkill(build, catalog) {
  const skills = (build.skills || []).map(id => skillById(catalog, id)).filter(Boolean);
  return skills.length === 1 ? skills[0] : null;
}

function isChanneledSkill(skill) {
  return (skill?.tags || []).some(tag => String(tag).toLowerCase().includes('channel'));
}

function conditionUptimeKey(text) {
  if (text.includes('healthy') && text.includes('injured')) return 'healthyInjured';
  if (text.includes('consecutive') && text.includes('weapon')) return 'consecutiveWeapon';
  if (text.includes('berserk')) return 'berserk';
  if (text.includes('vulnerable')) return 'vulnerable';
  if (text.includes('overpower')) return 'overpower';
  if (text.includes('channel')) return 'channeling';
  if (text.includes('fortif')) return 'fortified';
  if (text.includes('unstoppable')) return 'unstoppable';
  if (/\babove\b/.test(text) && text.includes('50')) return 'furyAbove50';
  return null;
}

function createsDustDevils(skill) {
  if (!skill) return false;
  const listed = (skill.effects || []).some(effect => /dust devil/i.test(effect.stat || '') && pointValue(effect.value) != null);
  const allocated = (skill.modifiers || []).some(mod => mod.allocated === true && /dust devil/i.test(mod.text || ''));
  return listed || allocated;
}

function conditionState(effect, build, catalog) {
  if (effect.conditions == null) return { state: 'unknown' };
  if (effect.conditions.length === 0) return { state: 'active' };
  const tags = new Set();
  for (const id of build.skills || []) {
    for (const tag of skillById(catalog, id)?.tags || []) tags.add(String(tag).toLowerCase().replace(/\?$/, ''));
  }
  let partial = null;
  for (const raw of effect.conditions) {
    const text = String(raw).toLowerCase();
    if (text.includes('?')) return { state: 'unknown' };
    if (text.includes('potion')) {
      const missing = build.uptime?.missingPotions;
      if (typeof missing !== 'number') return { state: 'unknown' };
      if (missing <= 0) return { state: 'inactive' };
      return { state: 'unknown' };
    }
    if ((text.includes('you are healthy') || (text.includes('while') && text.includes('healthy'))) && !text.includes('injured')) {
      const value = build.uptime?.playerHealthy;
      if (typeof value !== 'number') return { state: 'unknown' };
      if (value <= 0) return { state: 'inactive' };
      if (value < 1) partial = 'playerHealthy';
      continue;
    }
    if (text.includes('dust devil')) {
      if (!(text.includes('after') || text.includes('creating'))) return { state: 'inactive' };
      if (!createsDustDevils(singleSkill(build, catalog))) return { state: 'inactive' };
      const value = build.uptime?.dustDevil;
      if (typeof value !== 'number') return { state: 'unknown' };
      if (value <= 0) return { state: 'inactive' };
      if (value < 1) partial = 'dustDevil';
      continue;
    }
    const key = conditionUptimeKey(text);
    if (key === 'consecutiveWeapon') {
      if (!isChanneledSkill(singleSkill(build, catalog))) return { state: 'inactive' };
      const value = build.uptime?.consecutiveWeapon;
      if (typeof value !== 'number') return { state: 'unknown' };
      if (value <= 0) return { state: 'inactive' };
      if (value < 1) partial = key;
      continue;
    }
    if (STATE_UPTIMES.has(key)) {
      if (typeof build.uptime?.[key] !== 'number') return { state: 'unknown' };
      if (build.uptime[key] <= 0) return { state: 'inactive' };
      if (effect.alignWithState === true && build.uptime[key] < 1) partial = key;
      continue;
    }
    if (/\btwo-handed\b/.test(text)) {
      const hands = (build.gear || []).map(slot => slot.hands).filter(Boolean);
      if (hands.includes('2H')) continue;
      if (hands.length) return { state: 'inactive' };
      return { state: 'unknown' };
    }
    if (BLENDED_UPTIMES.has(key)) {
      const value = build.uptime?.[key];
      if (typeof value !== 'number') return { state: 'unknown' };
      if (key === 'channeling' && !isChanneledSkill(singleSkill(build, catalog))) return { state: 'inactive' };
      if (value <= 0) return { state: 'inactive' };
      if (value < 1) partial = key;
      continue;
    }
    if (/\b(while|above|below)\b/.test(text)) return { state: 'unknown' };
    if (!tags.has(text.replace(/\?$/, ''))) return { state: 'inactive' };
  }
  if (partial) return { state: 'partial', when: partial };
  return { state: 'active' };
}

const NON_DAMAGE_KINDS = new Set(['defense', 'resource', 'mobility', 'utility', 'base-weapon']);

const FORMULA_BUCKETS = new Set(['crit-mult', 'vuln-mult']);

function formulaEffect(effect) {
  const stat = effect?.stat || '';
  if (/vulnerable damage multiplier/i.test(stat) && (effect.bucket === 'multiplicative' || effect.bucket === 'vuln-mult')) {
    return { ...effect, bucket: 'vuln-mult' };
  }
  if (/critical strike damage multiplier/i.test(stat)) {
    return { ...effect, bucket: 'crit-mult', conditions: Array.isArray(effect.conditions) ? effect.conditions : [] };
  }
  return effect;
}

export function damageEffects(entity, build, catalog) {
  const active = [];
  for (const effect of entity.effects || []) {
    if (effect.scored === false) continue;
    if (NON_DAMAGE_KINDS.has(effect.kind)) continue;
    const scoring = formulaEffect(effect);
    const value = pointValue(scoring.value);
    const bucket = knownBucket(scoring.bucket) || (FORMULA_BUCKETS.has(scoring.bucket) ? scoring.bucket : null);
    if (value == null || !bucket) continue;
    const judged = build ? conditionState(scoring, build, catalog) : { state: scoring.conditions && scoring.conditions.length === 0 ? 'active' : 'unknown' };
    if (judged.state === 'inactive') continue;
    let when = judged.when || null;
    if (bucket === 'vuln-mult' && !when && build) {
      const up = build.uptime?.vulnerable;
      if (typeof up === 'number' && up > 0 && up < 1) when = 'vulnerable';
    }
    active.push({ effect: scoring, value, bucket, state: judged.state, when });
  }
  return active;
}

const GLYPH_LEVEL_FORMULA = 'min + (max - min) * (level - 1) / (maxLevel - 1)';

function scaledEffectValue(effect, level) {
  const upgrade = effect?.upgrade;
  const range = effect?.range;
  if (!upgrade || upgrade.formula !== GLYPH_LEVEL_FORMULA || !Array.isArray(range)) return null;
  const maxLevel = upgrade.maxLevel;
  const [min, max] = range;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof maxLevel !== 'number' || maxLevel <= 1) return null;
  if (typeof level !== 'number') return null;
  return min + (max - min) * (level - 1) / (maxLevel - 1);
}

function scaledGlyph(glyph, level) {
  let scaledCount = 0;
  let unscaled = 0;
  const effects = (glyph.effects || []).map(effect => {
    const scaled = scaledEffectValue(effect, level);
    const damage = knownBucket(effect.bucket) && pointValue(effect.value) != null && effect.scored !== false && !NON_DAMAGE_KINDS.has(effect.kind);
    if (scaled != null) {
      scaledCount += 1;
      return { ...effect, value: scaled };
    }
    if (damage) {
      unscaled += 1;
      return { ...effect, scored: false };
    }
    return effect;
  });
  if (!scaledCount) return null;
  return { glyph: { ...glyph, effects }, unscaled };
}

function appendDamageModifiers(entity, build, catalog, modifiers, notes, label, alternateCrit) {
  for (const piece of damageEffects(entity, build, catalog)) {
    if (piece.effect.alternateReading === true) {
      if (piece.state === 'active' || piece.state === 'partial') {
        alternateCrit.push({ name: label.name, value: piece.value });
        notes.push(`${label.name}: +${piece.value}%[x] Critical Strike Damage is an alternate reading. The headline score leaves it out.`);
      }
      continue;
    }
    if (piece.state === 'unknown') {
      const stat = piece.effect.stat || '';
      const cond = (piece.effect.conditions || []).join(' ');
      if (/potion/i.test(stat) || /potion/i.test(cond)) notes.push(`${label.name}: damage per missing potion needs a potion count. Needs input.`);
      else if (/while you are healthy/i.test(cond)) notes.push(`${label.name}: ${piece.value}% while you are Healthy is the player's life. No player-healthy uptime is stored, so this line stays out of the score.`);
      else if (/healthy|injured/i.test(stat) || /healthy|injured/i.test(cond)) notes.push(`${label.name}: Healthy and Injured share is pending, damage effect not applied.`);
      else notes.push(`${label.name}: condition unknown, damage effect not applied.`);
      continue;
    }
    if (piece.bucket === 'additive' && typeof build.additivePct === 'number') continue;
    if (piece.bucket === 'overpower' && typeof build.overpowerPct === 'number') {
      notes.push(`${label.name}: Overpower per-stack line is included in overpowerPct and is not added again.`);
      continue;
    }
    if (piece.bucket === 'crit' && typeof build.critDmg === 'number') {
      notes.push(`${label.name}: Critical Strike Damage ${piece.value} stays out of the [x] Critical Strike Damage Multiplier sum. The sheet total ${build.critDmg}% is the additive crit input.`);
      continue;
    }
    const modifier = { name: label.name, bucket: piece.bucket, value: piece.value, active: true, kind: label.kind, id: entity.id };
    if (piece.when) modifier.when = piece.when;
    modifiers.push(modifier);
  }
}

const SHEET_ELEMENTS = ['physical', 'fire', 'lightning', 'cold', 'holy', 'poison', 'shadow'];

function skillDamageElement(skill) {
  const text = [skill?.tooltip, skill?.note, skill?.aura?.note, ...(skill?.effects || []).map(effect => `${effect.stat || ''} ${effect.note || ''}`)].join('\n');
  const hits = SHEET_ELEMENTS.filter(name => new RegExp(`\\b${name}\\b`, 'i').test(text));
  return hits.length === 1 ? hits[0] : null;
}

function pushSheetLine(modifiers, name, value, when) {
  if (typeof value !== 'number' || value === 0) return;
  const modifier = { name, bucket: 'additive', value, active: true, sheetConditional: true, kind: 'sheet' };
  if (when) modifier.when = when;
  modifiers.push(modifier);
}

function sheetWhen(uptime, key) {
  const value = uptime?.[key];
  if (typeof value !== 'number' || value <= 0) return { skip: true };
  if (value < 1) return { when: key };
  return {};
}

function applyOffensiveSheet(build, skills, modifiers, notes) {
  const sheet = build.offensiveSheet;
  if (!sheet) return;
  const uptime = build.uptime || {};
  const element = skills.length === 1 ? skillDamageElement(skills[0]) : null;
  if (element && typeof sheet[element] === 'number') {
    pushSheetLine(modifiers, `Damage with ${element[0].toUpperCase()}${element.slice(1)}`, sheet[element]);
    notes.push(`Offensive sheet: Damage with ${element} ${sheet[element]}% is in the additive bucket for this skill.`);
  } else if (skills.length === 1) {
    notes.push(`${skills[0].name}: no single damage element is stored, so the sheet element row stays out.`);
  }
  const vulnerable = sheetWhen(uptime, 'vulnerable');
  if (!vulnerable.skip && build.vulnerableDamageInAdditive === true) {
    pushSheetLine(modifiers, 'Vulnerable Damage', sheet.vulnerable, vulnerable.when);
  }
  const elites = sheetWhen(uptime, 'elites');
  if (!elites.skip) pushSheetLine(modifiers, 'vs Elites', sheet.vsElites, elites.when);
  const healthyInjured = sheetWhen(uptime, 'healthyInjured');
  if (!healthyInjured.skip && sheet.vsHealthy === sheet.vsInjured) {
    pushSheetLine(modifiers, 'vs Healthy or Injured', sheet.vsHealthy, healthyInjured.when);
    notes.push('Offensive sheet: vs Healthy and vs Injured are each 26%. An enemy is in only one of those states, so the shared window adds 26 once.');
  }
  const playerHealthy = sheetWhen(uptime, 'playerHealthy');
  if (!playerHealthy.skip) pushSheetLine(modifiers, 'while you are Healthy', sheet.whileHealthy, playerHealthy.when);
  const fortified = sheetWhen(uptime, 'fortified');
  if (!fortified.skip) pushSheetLine(modifiers, 'while Fortified', sheet.whileFortified, fortified.when);
  if (uptime.missingPotions === 0 && (build.glyphs || []).some(glyph => glyph.glyphId === 'imbiber')) {
    notes.push('Imbiber: 5%[x] per missing potion uses 0 missing potions of a capacity of 4. The factor is 1.0. Estimate.');
  }
  notes.push('Double-count: sheet vs Healthy 26% and vs Injured 26% match Might 26%[x]. While Fortified 35% does not match Warbringer 45%[x] or Crushing 64%[x], so a sheet row is a separate additive source from an [x] line. Headline keeps the additive 26 and Might 26%[x].');
  notes.push('Double-count: Vulnerable Damage 208.8% stays in the additive bucket on the Vulnerable state. Headline: that percent does not include the base 20%. The vulnerable factor is 1.2 × (1 + sum of [x] Vulnerable Damage Multiplier). Melted Heart x35% is in that sum and is not also in the general [x] product.');
  notes.push('Double-count: while Fortified 35% is additive. Warbringer 45%[x] and Crushing 64%[x] stay multiplicative.');
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
  const alternateCrit = [];
  if (skills.length > 1) notes.push('Multiple skills are not summed into one coefficient. Power uses no coeff until a single core skill is selected.');
  if (!dotKnown) notes.push('DoT flag is unknown for a selected skill. Crit was not removed.');
  for (const slot of build.gear || []) {
    for (const ref of [['aspect', slot.aspectId, catalog.aspects], ['unique', slot.uniqueId, catalog.uniques]]) {
      const [kind, id, list] = ref;
      if (!id) continue;
      const entity = (list || []).find(item => item.id === id);
      if (!entity) continue;
      appendDamageModifiers(entity, build, catalog, modifiers, notes, { name: `${entity.name} (${slot.slotId})`, kind }, alternateCrit);
    }
    for (const placed of slot.affixes || []) {
      if (!placed?.affixId) continue;
      const affix = (catalog.affixes || []).find(item => item.id === placed.affixId);
      if (!affix) continue;
      const effects = (affix.effects || []).map(effect => (typeof placed.value === 'number' ? { ...effect, value: placed.value } : effect));
      appendDamageModifiers({ ...affix, effects }, build, catalog, modifiers, notes, { name: `${affix.name} (${slot.slotId})`, kind: 'affix' }, alternateCrit);
    }
  }
  for (const board of build.boards || []) {
    for (const nodeId of board.nodeIds || []) {
      const node = (catalog.paragonNodes || []).find(item => item.id === nodeId);
      if (!node) {
        notes.push(`Paragon node ${nodeId} is not in the catalog.`);
        continue;
      }
      appendDamageModifiers(node, build, catalog, modifiers, notes, { name: node.name, kind: 'paragon' }, alternateCrit);
    }
  }
  for (const placed of build.glyphs || []) {
    const glyph = (catalog.glyphs || []).find(item => item.id === placed.glyphId);
    if (!glyph) {
      notes.push(`Glyph ${placed.glyphId} is not in the catalog.`);
      continue;
    }
    if (typeof placed.level !== 'number') {
      notes.push(`${glyph.name}: glyph level is unknown, so its damage lines are not applied.`);
      continue;
    }
    let scoring = glyph;
    if (placed.provisional === true || glyph.provisional === true) {
      const scaled = scaledGlyph(glyph, placed.level);
      if (!scaled) {
        notes.push(`${glyph.name}: provisional level ${placed.level} has no level-scaling formula in the catalog, so its damage lines are not applied. Needs input.`);
        continue;
      }
      scoring = scaled.glyph;
      if (scaled.unscaled) notes.push(`${glyph.name}: provisional level ${placed.level} leaves ${scaled.unscaled} damage line${scaled.unscaled === 1 ? '' : 's'} unscored. No level-scaling formula is stored for ${scaled.unscaled === 1 ? 'it' : 'them'}. Needs input.`);
    }
    appendDamageModifiers(scoring, build, catalog, modifiers, notes, { name: `${glyph.name} (glyph ${placed.level})`, kind: 'glyph' }, alternateCrit);
    for (const effect of scoring.effects || []) {
      const stat = effect.stat || '';
      if (/per 5/i.test(stat)) {
        notes.push(`${glyph.name}: ${stat} shows ${effect.value} per 5. The paragon boards do not list attributes purchased in range, so this rate is not multiplied into a total. Flagged.`);
      }
      if (effect.scored === false && /dust devil/i.test(stat) && knownBucket(effect.bucket)) {
        notes.push(`${glyph.name}: ${effect.value}% ${stat} stays off the skill coefficient. Dust Devil hits are not in that coefficient, and no Dust Devil hit rate is stored.`);
      }
    }
  }
  applyOffensiveSheet(build, skills, modifiers, notes);
  if (typeof build.additivePct === 'number') {
    const verified = build.additiveAudit?.verified === true ? 'Screenshot-verified' : 'Video-read, unverified';
    notes.push(`Additive audit: sheet All Damage ${build.additivePct}% is the unconditional additive base. ${verified}. The conditional sheet rows join that same sum. Catalog +% Damage lines stay out of the sum.`);
  }
  const auras = [];
  for (const skill of skills) {
    const aura = skill.aura;
    if (!aura || typeof aura.uptime !== 'number') continue;
    if (typeof aura.coeffPct === 'number' && aura.coeffPct !== 0) {
      auras.push({ name: `${skill.name} aura`, coeffPct: aura.coeffPct, isDot: aura.dot === true, uptime: aura.uptime, estimate: aura.estimate === true });
    }
    if (typeof aura.burnCoeffPct === 'number' && aura.burnCoeffPct !== 0) {
      auras.push({ name: `${skill.name} burn`, coeffPct: aura.burnCoeffPct, isDot: aura.burnDot !== false, uptime: aura.uptime, estimate: aura.estimate === true });
    }
  }
  for (const aura of auras) {
    if (aura.estimate) notes.push(`${aura.name} is applied for uptime ${aura.uptime}. That fraction is an estimate.`);
  }
  if (build.overpowerStacks && typeof build.overpowerPct === 'number') {
    const stacks = build.overpowerStacks;
    notes.push(`Overpower is ${stacks.activeStacks} stacks × ${stacks.perStack}% = ${build.overpowerPct}%, including a ${stacks.lingerSeconds}s linger. The uptime is an estimate.`);
  }
  const estimate = uptime.estimate || {};
  for (const [key, label] of [['channeling', 'Channeling'], ['furyAbove50', 'Fury above 50'], ['unstoppable', 'Unstoppable'], ['fortified', 'Fortified'], ['healthyInjured', 'Healthy or Injured'], ['dustDevil', 'Dust Devil'], ['consecutiveWeapon', 'Consecutive weapon'], ['elites', 'Elites'], ['playerHealthy', 'Player Healthy'], ['missingPotions', 'Missing potions']]) {
    if (estimate[key] === true && typeof uptime[key] === 'number') {
      notes.push(`${label} uptime ${uptime[key]} is an estimate.`);
    }
  }
  if (typeof build.critChance === 'number' && typeof build.critDmg === 'number' && build.critDmg > 0) {
    const critMults = modifiers.filter(mod => mod.bucket === 'crit-mult');
    const summed = 1 + critMults.reduce((sum, mod) => sum + mod.value / 100, 0);
    notes.push(`Crit formula [A][B][C]: (A + ${build.critDmg / 100}) / A × 1.5 × (1 + sum of Critical Strike Damage Multiplier [x]). A is the state's additive factor. At ${build.critChance}% crit chance the crit factor is used directly. Headline: sheet ${build.critDmg}% is additive Critical Strike Damage. It does not include the base 50% or the [x] multipliers ${critMults.map(mod => mod.value).join(' + ') || '(none)'} (factor ${summed.toFixed(4)}). Confidence: high on the mechanic, low on the sheet display. Sources: [A] https://d4guides.gg/en/guides/mechanics/damage-calculation-in-diablo-4-how-your-damage-works ; [B] https://mobalytics.gg/diablo-4/guides/damage-buckets-deep-dive ; [C] https://www.wowhead.com/diablo-4/news/breaking-down-the-critical-strike-and-vulnerable-damage-change-diablo-4-335487.`);
  }
  if (modifiers.some(mod => mod.bucket === 'vuln-mult') || build.vulnerableDamageInAdditive === true) {
    const sheetVuln = build.offensiveSheet?.vulnerable;
    const sheetText = build.vulnerableDamageInAdditive === true && typeof sheetVuln === 'number'
      ? ` Sheet Vulnerable Damage ${sheetVuln}% stays additive on that state. Headline: it does not include the base 20% (low confidence on the sheet display).`
      : '';
    notes.push(`Vulnerable formula [A][B][C]: ×1.2 vs Vulnerable targets (high confidence), times (1 + sum of [x] Vulnerable Damage Multiplier) (medium confidence).${sheetText}`);
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
    notes,
    auras,
    additivePct: typeof build.additivePct === 'number' ? build.additivePct : null,
    vulnerableDamageInAdditive: build.vulnerableDamageInAdditive === true,
    alternateCrit
  };
}

function modifiersFor(input, patch) {
  return (input.modifiers || []).filter(mod => !mod.when || patch[mod.when] !== false);
}

function scoreWithAuras(input, patch) {
  const modifiers = modifiersFor(input, patch);
  const direct = compute({ ...input, ...patch, modifiers });
  let total = direct.total;
  const extra = [];
  for (const aura of input.auras || []) {
    const part = compute({ ...input, ...patch, modifiers, coeffPct: aura.coeffPct, isDot: aura.isDot });
    const scaled = part.total * aura.uptime;
    total += scaled;
    extra.push({ label: aura.name, value: scaled, expr: `${part.total} × ${aura.uptime}` });
  }
  return {
    ...direct,
    total,
    terms: [...direct.terms, ...extra]
  };
}

function blendFlags(input, uptime) {
  const flags = [];
  if (typeof uptime.vulnerable === 'number') flags.push(['vulnerable', uptime.vulnerable]);
  if (typeof uptime.overpower === 'number') flags.push(['overpower', uptime.overpower]);
  for (const key of [...BLENDED_UPTIMES, 'healthyInjured']) {
    const raw = uptime[key];
    if (typeof raw === 'number' && raw > 0 && raw < 1 && (input.modifiers || []).some(mod => mod.when === key)) {
      flags.push([key, raw]);
    }
  }
  return flags;
}

function blendScore(input, uptime) {
  const flags = blendFlags(input, uptime);
  if (!flags.length) return scoreWithAuras(input, {});
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
    const result = scoreWithAuras(input, state.patch);
    total += result.total * state.weight;
    if (!shown || state.weight >= shown.weight) shown = { result, weight: state.weight };
  }
  return {
    ...shown.result,
    total,
    terms: [...shown.result.terms, { label: 'Uptime blend', value: total, expr: `expected value across ${flags.map(([key]) => key).join(', ')} uptime` }]
  };
}

function applyFormulaOpts(input, opts = {}) {
  let modifiers = (input.modifiers || []).map(mod => ({ ...mod }));
  if (opts.omitCritMult === true) modifiers = modifiers.filter(mod => mod.bucket !== 'crit-mult');
  if (Array.isArray(opts.onlyCritMultValues)) {
    modifiers = modifiers.filter(mod => mod.bucket !== 'crit-mult' || opts.onlyCritMultValues.includes(mod.value));
  }
  if (opts.vulnerableBaseInSheet === true) {
    modifiers = modifiers.map(mod => (mod.name === 'Vulnerable Damage' ? { ...mod, value: mod.value - 20 } : mod));
  }
  if (typeof opts.addCritMult === 'number') {
    modifiers = [...modifiers, { name: opts.addCritMultName || 'extra crit multiplier', bucket: 'crit-mult', value: opts.addCritMult, active: true }];
  }
  return {
    ...input,
    modifiers,
    ...(opts.vulnMultMode ? { vulnMultMode: opts.vulnMultMode } : {}),
    ...(opts.critMultMode ? { critMultMode: opts.critMultMode } : {}),
    ...(opts.critSheetIncludesBase === true ? { critSheetIncludesBase: true } : {})
  };
}

export function evaluateBuild(catalog, build, opts = {}) {
  const input = applyFormulaOpts(engineInputFromBuild(catalog, build, opts), opts);
  const uptime = build.uptime || blankUptime();
  const result = blendScore(input, uptime);
  let critAlternate = null;
  let conditionalCritAlternate = null;
  if (typeof build.critChance === 'number' && build.critChance > 0 && typeof build.critDmg === 'number' && build.critDmg > 0 && opts.omitCritMult !== true) {
    const stripped = applyFormulaOpts(input, { omitCritMult: true });
    const alt = blendScore(stripped, uptime);
    critAlternate = {
      total: alt.total,
      reading: 'sheet-includes-crit-multipliers',
      verified: false
    };
    const flawless = (input.alternateCrit || []).reduce((sum, item) => sum + item.value, 0);
    if (flawless) {
      const conditional = blendScore(applyFormulaOpts(input, { addCritMult: flawless, addCritMultName: 'Flawless Technique' }), uptime);
      conditionalCritAlternate = {
        total: conditional.total,
        multiplier: 1 + flawless / 100,
        estimate: true,
        verified: false
      };
    }
  }
  return { input, result, marginal: marginal(input), critAlternate, conditionalCritAlternate };
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
