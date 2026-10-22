import { marginal } from './engine.js';
import { blankBuild, damageEffects, emptyGear, engineInputFromBuild, evaluateBuild, knownBucket, pointValue, slotIds, unverifiedShare, verificationFields, buildKeys } from './catalog.js';
import { checkBuild } from './constraints.js';
import { noveltyAgainstMeta, rankByPowerNovelty } from './novelty.js';

export function combinations(values, size) {
  const out = [];
  const walk = (start, acc) => {
    if (acc.length === size) {
      out.push([...acc]);
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      acc.push(values[index]);
      walk(index + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}

export function enumerateSkillCores(catalog, opts = {}) {
  const tags = opts.tags || [];
  const cap = opts.maxSkills ?? catalog.constraints?.skillBarSize ?? 1;
  const limit = opts.coreLimit ?? 100;
  const pool = (catalog.skills || []).filter(skill => skill.allocated !== false && tags.every(tag => (skill.tags || []).includes(tag)));
  const cores = [];
  const max = Math.max(0, Math.min(cap, pool.length));
  for (let size = 1; size <= max; size += 1) {
    for (const combo of combinations(pool, size)) {
      cores.push(combo);
      if (cores.length >= limit) return cores;
    }
  }
  return cores;
}

function gearItemVerified(entity) {
  if (entity?.verified !== true || !Array.isArray(entity.slots)) return false;
  const damage = (entity.effects || []).filter(effect => knownBucket(effect.bucket) && pointValue(effect.value) != null);
  if (!damage.length) return false;
  return damage.every(effect => effect.verified === true && Array.isArray(effect.conditions) && typeof effect.stacking === 'string' && effect.stacking);
}

export function collectGearCandidates(catalog, build, opts = {}) {
  const defs = new Map((catalog.constraints?.gearSlots || []).map(slot => [slot.id, slot]));
  const candidates = [];
  for (const [kind, list] of [['aspect', catalog.aspects || []], ['unique', catalog.uniques || []]]) {
    for (const entity of list) {
      if (kind === 'unique' && !Array.isArray(entity.slots)) continue;
      if (opts.includeUnverified !== true && !gearItemVerified(entity)) continue;
      const pieces = damageEffects(entity, build, catalog).filter(piece => piece.state === 'active' || piece.state === 'partial');
      if (!pieces.length) continue;
      candidates.push({
        key: `${kind}:${entity.id}`,
        kind,
        id: entity.id,
        name: entity.name,
        slots: entity.slots,
        slotDefs: defs,
        effects: pieces.map(piece => ({ bucket: piece.bucket, value: piece.value })),
        modifiers: pieces.map(piece => ({ name: entity.name, bucket: piece.bucket, value: piece.value, active: true }))
      });
    }
  }
  return candidates;
}

export function marginalScore(input, candidate) {
  const probe = marginal(input);
  return candidate.effects.reduce((sum, effect) => sum + (probe[effect.bucket] || 0) * effect.value, 0);
}

export function marginalRank(input, candidates) {
  return candidates
    .map(candidate => ({ ...candidate, score: marginalScore(input, candidate) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function cloneGear(gear) {
  return gear.map(slot => ({ ...slot, affixes: slot.affixes.map(affix => ({ ...affix })) }));
}

function firstSlot(gear, candidate) {
  for (const slot of gear) {
    if (slot.aspectId || slot.uniqueId) continue;
    const def = candidate.slotDefs.get(slot.slotId);
    if (!def) continue;
    if (candidate.kind === 'aspect') {
      if (!def.acceptsAspect) continue;
      if (Array.isArray(candidate.slots) && !candidate.slots.includes(slot.slotId)) continue;
      return slot;
    }
    if (!def.acceptsUnique) continue;
    if (!Array.isArray(candidate.slots) || !candidate.slots.includes(slot.slotId)) continue;
    return slot;
  }
  return null;
}

function assign(slot, candidate) {
  if (candidate.kind === 'aspect') slot.aspectId = candidate.id;
  else slot.uniqueId = candidate.id;
}

function pack(candidate, slotId) {
  const primary = candidate.effects[0];
  return { kind: candidate.kind, id: candidate.id, name: candidate.name, slotId, bucket: primary.bucket, value: primary.value, effects: candidate.effects };
}

function withGear(build, gear) {
  return { ...build, gear };
}

export function greedyAssign(catalog, build, opts = {}) {
  let gear = cloneGear(build.gear);
  const chosen = [];
  const skipped = new Set();
  let guard = 100;
  while (guard--) {
    const current = { ...build, gear };
    const ranked = marginalRank(engineInputFromBuild(catalog, current, opts), collectGearCandidates(catalog, current, opts))
      .filter(candidate => !skipped.has(candidate.key) && !chosen.some(item => item.kind === candidate.kind && item.id === candidate.id));
    let placed = false;
    for (const candidate of ranked) {
      if (candidate.score <= 0) break;
      const slot = firstSlot(gear, candidate);
      if (!slot) continue;
      assign(slot, candidate);
      chosen.push(pack(candidate, slot.slotId));
      placed = true;
      break;
    }
    if (!placed) {
      const blocked = ranked.find(candidate => candidate.score > 0);
      if (!blocked) break;
      skipped.add(blocked.key);
    }
  }
  return { build: withGear(build, gear), chosen };
}

export function beamSearch(catalog, build, opts = {}) {
  const width = opts.beamWidth ?? 3;
  const pool = marginalRank(engineInputFromBuild(catalog, build, opts), collectGearCandidates(catalog, build, opts));
  const powerOf = gear => evaluateBuild(catalog, withGear(build, gear), opts).result.total;
  let beam = [{ gear: cloneGear(build.gear), chosen: [], used: [] }];
  const depth = Math.min(pool.length, slotIds(catalog).length);
  for (let step = 0; step < depth; step += 1) {
    const next = [];
    for (const state of beam) {
      next.push(state);
      for (const candidate of pool) {
        if (state.used.includes(candidate.key)) continue;
        const gear = cloneGear(state.gear);
        const slot = firstSlot(gear, candidate);
        if (!slot) continue;
        assign(slot, candidate);
        next.push({
          gear,
          chosen: [...state.chosen, pack(candidate, slot.slotId)],
          used: [...state.used, candidate.key]
        });
      }
    }
    const seen = new Set();
    const scored = next.map(state => ({ state, power: powerOf(state.gear) }));
    scored.sort((a, b) => b.power - a.power);
    beam = [];
    for (const row of scored) {
      const key = row.state.used.slice().sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      beam.push(row.state);
      if (beam.length >= width) break;
    }
  }
  const best = beam[0] || { gear: cloneGear(build.gear), chosen: [] };
  return { build: withGear(build, best.gear), chosen: best.chosen };
}

export function searchGear(catalog, build, opts = {}) {
  const greedy = greedyAssign(catalog, build, opts);
  const beam = beamSearch(catalog, build, opts);
  const greedyPower = evaluateBuild(catalog, greedy.build, opts).result.total;
  const beamPower = evaluateBuild(catalog, beam.build, opts).result.total;
  const picked = beamPower >= greedyPower ? beam : greedy;
  const evaluation = evaluateBuild(catalog, picked.build, opts);
  return { ...picked, power: evaluation.result.total, evaluation, greedy, beam, greedyPower, beamPower };
}

export function buildFromCore(catalog, skills, opts = {}) {
  const ids = skills.map(skill => skill.id);
  return blankBuild(catalog, {
    id: `core-${ids.join('+') || 'empty'}`,
    name: skills.map(skill => skill.name).join(' + ') || 'Empty core',
    skills: ids,
    rotation: ids.map(skillId => ({ skillId, castsPerSecond: opts.castsPerSecond ?? null })),
    uptime: opts.uptime || {},
    defense: opts.defense || {},
    weaponDmg: opts.weaponDmg ?? null,
    mainStat: opts.mainStat ?? null,
    critChance: opts.critChance ?? null,
    critDmg: opts.critDmg ?? null,
    vulnPct: opts.vulnPct ?? null,
    overpowerPct: opts.overpowerPct ?? null,
    additivePct: opts.additivePct ?? null,
    ...(opts.offensiveSheet ? { offensiveSheet: opts.offensiveSheet } : {}),
    ...(opts.vulnerableDamageInAdditive === true ? { vulnerableDamageInAdditive: true } : {}),
    boards: opts.boards || [],
    glyphs: opts.glyphs || [],
    gear: emptyGear(catalog).map(slot => ({
      ...slot,
      ...(opts.slotHands?.[slot.slotId] ? { hands: opts.slotHands[slot.slotId] } : {})
    }))
  });
}

export function explain(result) {
  const lines = [
    `Skills: ${(result.skillNames || []).join(', ') || '(none)'}`,
    result.gear?.length ? 'Gear:' : 'Gear: none'
  ];
  for (const piece of result.gear || []) {
    const effects = piece.effects?.map(effect => `${effect.bucket} ${effect.value}`).join(', ') || `${piece.bucket} ${piece.value}`;
    lines.push(`  ${piece.slotId}: ${piece.name} [${effects}]`);
  }
  lines.push('Why:');
  for (const term of result.terms || []) lines.push(`  ${term.label} = ${Number(term.value).toFixed(4)} ← ${term.expr}`);
  if (result.skipped?.length) lines.push(`Skipped null modifiers: ${result.skipped.join(', ')}`);
  for (const note of result.notes || []) lines.push(note);
  const marginal = result.marginal || {};
  lines.push('Marginal +1%: ' + Object.entries(marginal).map(([key, value]) => `${key} ${Number(value).toFixed(3)}%`).join(' | '));
  const detail = result.noveltyDetail || {};
  lines.push(`Power ${Number(result.power).toFixed(4)} × novelty ${Number(result.novelty).toFixed(4)} = score ${Number(result.score).toFixed(4)}`);
  lines.push(`Novelty nearest ${detail.nearestId || 'none'} — Jaccard ${fmt(detail.jaccard)}, bucket distance ${fmt(detail.bucket)}`);
  lines.push(`Unverified share ${(result.unverifiedShare * 100).toFixed(1)}%`);
  if (result.unverifiedFields?.length) lines.push(`Unverified fields: ${result.unverifiedFields.map(field => field.path).join(', ')}`);
  if (result.critAlternate) {
    lines.push(`Crit alternate (sheet % as the full multiplier) = ${result.critAlternate.factor.toFixed(4)}, power ${result.critAlternate.total.toFixed(4)}. Working factor ${result.critAlternate.bonusFactor.toFixed(4)}. Unverified.`);
  }
  if (result.conditionalCritAlternate) {
    const alt = result.conditionalCritAlternate;
    lines.push(`Conditional crit-damage alternate ×${alt.multiplier} = factor ${alt.critFactor.toFixed(4)}, power ${alt.total.toFixed(4)}. Estimate. The headline score leaves this buff out.`);
  }
  return lines.join('\n');
}

function fmt(value) {
  return typeof value === 'number' ? value.toFixed(4) : 'n/a';
}

export function optimize(catalog, opts = {}) {
  const meta = opts.metaBuilds || { builds: [] };
  const considered = [];
  const rejected = [];
  for (const skills of enumerateSkillCores(catalog, opts)) {
    const base = buildFromCore(catalog, skills, opts);
    const gate = checkBuild(catalog, base, opts.minimums);
    if (gate.rejected) {
      rejected.push({ name: base.name, violations: gate.violations });
      continue;
    }
    const searched = searchGear(catalog, base, opts);
    const after = checkBuild(catalog, searched.build, opts.minimums);
    if (after.rejected) {
      rejected.push({ name: searched.build.name, violations: after.violations });
      continue;
    }
    const evaluation = searched.evaluation;
    const fields = verificationFields(catalog, searched.build, opts);
    const share = unverifiedShare(catalog, searched.build, opts);
    const novelty = noveltyAgainstMeta(buildKeys(searched.build), evaluation.result.buckets, meta);
    considered.push({
      id: searched.build.id,
      name: searched.build.name,
      build: searched.build,
      skills: skills.map(skill => skill.id),
      skillNames: skills.map(skill => skill.name),
      gear: searched.chosen,
      power: evaluation.result.total,
      buckets: evaluation.result.buckets,
      terms: evaluation.result.terms,
      skipped: evaluation.result.skipped,
      notes: [...(evaluation.input.notes || []), `Greedy power ${searched.greedyPower.toFixed(4)}; beam power ${searched.beamPower.toFixed(4)}.`],
      marginal: evaluation.marginal,
      unverifiedShare: share,
      unverifiedFields: fields.filter(field => !field.ok),
      novelty: novelty.novelty,
      noveltyDetail: novelty,
      critAlternate: evaluation.critAlternate,
      conditionalCritAlternate: evaluation.conditionalCritAlternate
    });
  }
  const ranked = rankByPowerNovelty(considered, opts).map(result => ({ ...result, why: explain({ ...result, score: result.power * result.novelty }) }));
  return { ranked, rejectedCount: rejected.length, considered: considered.length, rejected };
}

