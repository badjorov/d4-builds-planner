import { evaluateBuild, resolveCritReading, resolveOverpowerMeaning, resolveSoulModel } from './catalog.js';

const EPS = 1e-6;
export const ROTATION_HORIZON_S = 60;
export const SOUL_REPORTS = [15, 30, 200];

function roundTime(value) {
  return Math.round(value * 1e6) / 1e6;
}

function isShoutName(name) {
  return /\b(shout|cry)\b/i.test(name || '');
}

export function sheetCooldownReduction(build) {
  const row = (build?.sheet?.videoReadings || []).find(item => item.stat === 'Cooldown Reduction' && typeof item.value === 'number');
  if (!row) return { pct: null, source: null, suspect: null, estimate: true, applied: false };
  return { pct: row.value, source: row.source, suspect: row.suspect === true, estimate: true, applied: true };
}

function shoutCooldownCut(catalog, build) {
  const placed = (build?.glyphs || []).find(glyph => glyph.glyphId === 'marshal');
  const glyph = (catalog.glyphs || []).find(item => item.id === 'marshal');
  const effect = (glyph?.effects || []).find(item => /non-shout/i.test(item.stat || '') && typeof item.value === 'number');
  if (!placed || !effect) return { seconds: null, source: null, estimate: true, applied: false };
  return { seconds: effect.value, source: effect.source || glyph.source, estimate: true, applied: true };
}

function unstoppableAfterglow(catalog) {
  for (const unique of catalog.uniques || []) {
    for (const effect of unique.effects || []) {
      if (!/while unstoppable/i.test((effect.conditions || []).join(' '))) continue;
      const match = String(effect.note || '').match(/for (\d+(?:\.\d+)?)s after/i);
      if (match) return { seconds: Number(match[1]), source: effect.source || unique.source, estimate: true };
    }
  }
  return { seconds: null, source: null, estimate: true };
}

function buffLines(skill) {
  const lines = [];
  const skipped = [];
  for (const effect of skill.effects || []) {
    if (effect.kind !== 'damage' || effect.bucket !== 'multiplicative' || typeof effect.value !== 'number') continue;
    if (/no separate duration/i.test(effect.note || '')) {
      skipped.push({ stat: effect.stat, value: effect.value, reason: 'No separate duration is stored.' });
      continue;
    }
    const conditions = Array.isArray(effect.conditions) ? effect.conditions : [];
    if (!conditions.length) {
      lines.push({ stat: effect.stat || 'damage', value: effect.value, assumed: false });
      continue;
    }
    if (conditions.length === 1 && /burning/i.test(conditions[0])) {
      lines.push({
        stat: effect.stat || 'damage',
        value: effect.value,
        assumed: true,
        assumption: 'Burning is tied to this skill\'s stored duration. That duration is the burn length.'
      });
      continue;
    }
    skipped.push({ stat: effect.stat, value: effect.value, reason: 'The condition has no stored uptime.' });
  }
  return { lines, skipped };
}

export function durationBuffs(catalog, build) {
  const buffs = [];
  for (const id of build?.skills || []) {
    const skill = (catalog.skills || []).find(item => item.id === id);
    if (!skill) continue;
    const duration = typeof skill.duration === 'number' ? skill.duration : null;
    const cooldown = typeof skill.cooldown === 'number' ? skill.cooldown : null;
    if (duration == null && cooldown == null) continue;
    const { lines, skipped } = buffLines(skill);
    const flags = [];
    if (duration == null) flags.push(`${skill.name}: duration is not stored.`);
    if (cooldown == null) flags.push(`${skill.name}: cooldown is not stored.`);
    for (const line of skipped) flags.push(`${skill.name}: ${line.value}% ${line.stat} stays off the timeline. ${line.reason}`);
    for (const line of lines) {
      if (line.assumed) flags.push(`${skill.name}: ${line.value}% ${line.stat} uses the stored duration. ${line.assumption}`);
    }
    buffs.push({
      id: skill.id,
      name: skill.name,
      duration,
      cooldown,
      isShout: isShoutName(skill.name),
      lines,
      skipped,
      simulated: duration != null && cooldown != null,
      estimate: true,
      flags
    });
  }
  return buffs;
}

function mergeIntervals(intervals) {
  const sorted = intervals
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1] + EPS) merged.push([start, end]);
    else last[1] = Math.max(last[1], end);
  }
  return merged;
}

function clipIntervals(casts, length, horizon) {
  const out = [];
  for (const start of casts) {
    const end = Math.min(horizon, roundTime(start + length));
    if (end > start + EPS) out.push([roundTime(start), end]);
  }
  return out;
}

export function simulateBuffRotation(buffs, opts = {}) {
  const horizon = typeof opts.horizon === 'number' && opts.horizon > 0 ? opts.horizon : ROTATION_HORIZON_S;
  const cdrPct = typeof opts.cdrPct === 'number' ? opts.cdrPct : null;
  const extraCdrPct = typeof opts.extraCdrPct === 'number' ? opts.extraCdrPct : 0;
  const cut = typeof opts.shoutCutSeconds === 'number' ? opts.shoutCutSeconds : 0;
  const linger = typeof opts.overpowerLinger === 'number' ? opts.overpowerLinger : null;
  const afterglow = typeof opts.unstoppableAfter === 'number' ? opts.unstoppableAfter : null;
  const sheetFactor = cdrPct == null ? 1 : 1 - cdrPct / 100;
  const extraFactor = extraCdrPct ? 1 - extraCdrPct / 100 : 1;
  const cdrFactor = sheetFactor * extraFactor;
  const notes = [];
  if (cdrPct == null) notes.push('No sheet Cooldown Reduction is stored. Tooltip cooldowns are used.');
  else notes.push(`Sheet Cooldown Reduction ${cdrPct}% scales each tooltip cooldown by ${sheetFactor}. Gear cooldown-reduction lines that are already inside that sheet total are not added again. The formula is an estimate.`);
  if (extraCdrPct) notes.push(`Extra Cooldown Reduction ${extraCdrPct}% multiplies the remaining cooldown after the sheet factor. That extra line is an estimate.`);
  if (cut > 0) notes.push(`Each Shout cast reduces other non-Shout cooldowns by ${cut}s. That flat cut is an estimate.`);
  notes.push('Every modeled buff is cast together at 0s, then again on cooldown. No phase between the skills is stored. Every uptime is an estimate.');

  const simulated = buffs.filter(buff => buff.simulated && buff.duration > 0 && buff.cooldown > 0);
  const state = simulated.map(buff => ({
    ...buff,
    effectiveCooldown: roundTime(buff.cooldown * cdrFactor),
    next: 0,
    casts: []
  }));
  if (state.some(buff => buff.effectiveCooldown <= 0)) {
    notes.push('A cooldown reduced to 0 is not simulated.');
  }
  const runnable = state.filter(buff => buff.effectiveCooldown > 0);

  let t = 0;
  let guard = 0;
  while (t < horizon - EPS && guard < 100000) {
    guard += 1;
    let shoutsThisT = 0;
    const castThisT = new Set();
    let batchGuard = 0;
    while (batchGuard < 20) {
      batchGuard += 1;
      const due = runnable.filter(buff => buff.next <= t + EPS && !castThisT.has(buff.id));
      if (!due.length) break;
      const shouts = due.filter(buff => buff.isShout).length;
      for (const buff of due) {
        buff.casts.push(roundTime(t));
        const reduction = buff.isShout ? 0 : cut * (shoutsThisT + shouts);
        buff.next = roundTime(Math.max(t, t + buff.effectiveCooldown - reduction));
        castThisT.add(buff.id);
      }
      shoutsThisT += shouts;
      if (shouts && cut > 0) {
        for (const buff of runnable) {
          if (buff.isShout || castThisT.has(buff.id)) continue;
          if (buff.next > t) buff.next = roundTime(Math.max(t, buff.next - cut * shouts));
        }
      }
    }
    const upcoming = runnable.map(buff => buff.next).filter(next => next > t + EPS);
    t = upcoming.length ? Math.min(horizon, ...upcoming) : horizon;
  }

  const intervals = {};
  for (const buff of runnable) intervals[buff.id] = clipIntervals(buff.casts, buff.duration, horizon);

  const wrath = runnable.find(buff => buff.id === 'wrath-of-the-berserker');
  const overpowerIntervals = [];
  if (wrath) {
    const tail = linger == null ? 0 : linger;
    if (linger == null) notes.push('Overpower linger is not stored, so Overpower follows the Wrath window only.');
    else notes.push(`Overpower stays at the stored full-stack assumption for the Wrath window and ${linger}s after. Partial stacks are not scaled. That is an estimate.`);
    for (const start of wrath.casts) {
      const end = Math.min(horizon, roundTime(start + wrath.duration + tail));
      if (end > start + EPS) overpowerIntervals.push([roundTime(start), end]);
    }
  }
  const unstoppableIntervals = [];
  if (wrath && afterglow != null) {
    notes.push(`Unstoppable on this timeline is Wrath's stored duration plus ${afterglow}s after. Iron Skin has no stored duration, so its window is not added.`);
    for (const start of wrath.casts) {
      const end = Math.min(horizon, roundTime(start + wrath.duration + afterglow));
      if (end > start + EPS) unstoppableIntervals.push([roundTime(start), end]);
    }
  } else if (wrath) {
    for (const [start, end] of intervals[wrath.id] || []) unstoppableIntervals.push([start, end]);
    notes.push('No stored Unstoppable afterglow was found. Unstoppable follows the Wrath window only.');
  }

  const bounds = new Set([0, horizon]);
  for (const list of Object.values(intervals)) {
    for (const [start, end] of list) {
      bounds.add(start);
      bounds.add(end);
    }
  }
  for (const [start, end] of [...overpowerIntervals, ...unstoppableIntervals]) {
    bounds.add(start);
    bounds.add(end);
  }
  const times = [...bounds].filter(time => time >= -EPS && time <= horizon + EPS).sort((a, b) => a - b);
  const segments = [];
  for (let index = 0; index < times.length - 1; index += 1) {
    const start = times[index];
    const end = times[index + 1];
    if (end <= start + EPS) continue;
    const mid = (start + end) / 2;
    const active = runnable.filter(buff => (intervals[buff.id] || []).some(([from, to]) => mid >= from && mid < to)).map(buff => buff.id);
    const overpower = overpowerIntervals.some(([from, to]) => mid >= from && mid < to);
    const unstoppable = unstoppableIntervals.some(([from, to]) => mid >= from && mid < to);
    segments.push({ start, end, seconds: end - start, active, overpower, unstoppable });
  }

  const uptime = {};
  for (const buff of runnable) {
    const seconds = segments.filter(segment => segment.active.includes(buff.id)).reduce((sum, segment) => sum + segment.seconds, 0);
    uptime[buff.id] = seconds / horizon;
  }
  const combinations = new Map();
  for (const segment of segments) {
    const key = segment.active.slice().sort().join('+') || '(none)';
    const row = combinations.get(key) || { ids: segment.active.slice().sort(), seconds: 0 };
    row.seconds += segment.seconds;
    combinations.set(key, row);
  }
  const rows = [...combinations.values()]
    .map(row => ({ ...row, fraction: row.seconds / horizon }))
    .sort((a, b) => b.seconds - a.seconds || a.ids.join().localeCompare(b.ids.join()));
  const overpowerSeconds = segments.filter(segment => segment.overpower).reduce((sum, segment) => sum + segment.seconds, 0);

  return {
    horizon,
    estimate: true,
    cdrPct,
    extraCdrPct,
    shoutCutSeconds: cut,
    notes,
    buffs: runnable.map(buff => ({
      id: buff.id,
      name: buff.name,
      duration: buff.duration,
      cooldown: buff.cooldown,
      effectiveCooldown: buff.effectiveCooldown,
      casts: buff.casts,
      uptime: uptime[buff.id],
      estimate: true
    })),
    uptime,
    overpowerUptime: overpowerSeconds / horizon,
    combinations: rows,
    segments
  };
}

const BASE_UPTIME = {
  channeling: 1,
  furyAbove50: 1,
  fortified: 1,
  dustDevil: 1,
  consecutiveWeapon: 1,
  playerHealthy: 1,
  missingPotions: 0,
  enemyInjured: 0
};

function sliceBuild(build, souls, slice) {
  return {
    ...build,
    skills: ['whirlwind'],
    souls,
    uptime: {
      ...build.uptime,
      ...BASE_UPTIME,
      estimate: {},
      vulnerable: slice.vulnerable,
      overpower: slice.overpower,
      berserk: slice.berserk,
      unstoppable: slice.unstoppable,
      healthyInjured: slice.enemyHealthy ? 1 : 0,
      elites: slice.elites,
      enemyHealthy: slice.enemyHealthy,
      enemyInjured: slice.enemyInjured || 0
    }
  };
}

function scoreSlice(catalog, build, slice, opts) {
  const options = {
    sheetContext: slice.sheetContext,
    allbuffEndpoint: slice.endpoint,
    critReading: opts.critReading || resolveCritReading(build, {}),
    soulModel: opts.soulModel || resolveSoulModel(build, {}),
    overpowerSheetMeaning: opts.overpowerSheetMeaning || resolveOverpowerMeaning(build, {}),
    extraModifiers: slice.extras || []
  };
  if (typeof opts.soulRatePct === 'number') options.soulRatePct = opts.soulRatePct;
  return evaluateBuild(catalog, sliceBuild(build, opts.souls, slice), options);
}

function extrasFor(buffs, activeIds, includeAssumed = true) {
  const extras = [];
  for (const buff of buffs) {
    if (!activeIds.includes(buff.id)) continue;
    for (const line of buff.lines) {
      if (!includeAssumed && line.assumed) continue;
      extras.push({
        name: `${buff.name}: ${line.stat}`,
        bucket: 'multiplicative',
        value: line.value,
        active: true,
        kind: 'skill',
        id: buff.id
      });
    }
  }
  return extras;
}

function soulFactor(souls, model, ratePct) {
  if (typeof ratePct !== 'number') {
    return model === 'compound' ? 1.041 ** souls : 1 + 0.041 * souls;
  }
  const per = 1 + ratePct / 100;
  return model === 'compound' ? per ** souls : 1 + (ratePct / 100) * souls;
}

function billions(total) {
  return Math.round(total / 1e7) / 100;
}

export function rotationReport(catalog, build, opts = {}) {
  const buffs = durationBuffs(catalog, build);
  const cdr = sheetCooldownReduction(build);
  const shoutCut = shoutCooldownCut(catalog, build);
  const afterglow = unstoppableAfterglow(catalog);
  const linger = typeof build?.overpowerStacks?.lingerSeconds === 'number' ? build.overpowerStacks.lingerSeconds : null;
  const rotation = simulateBuffRotation(buffs, {
    horizon: opts.horizon,
    cdrPct: cdr.pct,
    extraCdrPct: typeof opts.extraCdrPct === 'number' ? opts.extraCdrPct : 0,
    shoutCutSeconds: shoutCut.applied ? shoutCut.seconds : 0,
    overpowerLinger: linger,
    unstoppableAfter: afterglow.seconds
  });
  const simulated = buffs.filter(buff => buff.simulated);
  const allIds = simulated.map(buff => buff.id);
  const cache = new Map();
  const decorate = (slice, peak) => {
    const next = {
      ...slice,
      berserk: opts.forceBerserk ? 1 : slice.berserk,
      extras: [...(slice.extras || [])]
    };
    const more = typeof opts.extraModifiersFor === 'function' ? opts.extraModifiersFor(next, { peak }) : [];
    if (more?.length) next.extras = next.extras.concat(more);
    return next;
  };
  const evalSlice = (slice, meaning) => {
    const key = JSON.stringify({
      meaning,
      vulnerable: slice.vulnerable,
      overpower: slice.overpower,
      berserk: slice.berserk,
      unstoppable: slice.unstoppable,
      enemyHealthy: slice.enemyHealthy,
      elites: slice.elites,
      sheetContext: slice.sheetContext,
      endpoint: slice.endpoint,
      soulRatePct: opts.soulRatePct ?? null,
      extras: (slice.extras || []).map(extra => [extra.id, extra.bucket, extra.value])
    });
    if (!cache.has(key)) {
      cache.set(key, scoreSlice(catalog, build, slice, {
        souls: 30,
        soulModel: 'sum',
        overpowerSheetMeaning: meaning,
        soulRatePct: opts.soulRatePct
      }).result.total);
    }
    return cache.get(key);
  };

  const peakSlice = decorate({
    vulnerable: 1,
    overpower: 1,
    berserk: 1,
    unstoppable: 1,
    enemyHealthy: 1,
    elites: 1,
    sheetContext: 'combat-allbuff',
    endpoint: 'high',
    extras: extrasFor(simulated, allIds)
  }, true);
  const peakTotal30 = evalSlice(peakSlice, 'total');
  const peakPerStack30 = evalSlice(peakSlice, 'perStack');
  const peakScore = scoreSlice(catalog, build, peakSlice, { souls: 30, soulModel: 'sum', overpowerSheetMeaning: 'total' });
  const peakWithoutAssumed = scoreSlice(catalog, build, {
    ...peakSlice,
    extras: extrasFor(simulated, allIds, false)
  }, { souls: 30, soulModel: 'sum', overpowerSheetMeaning: 'total' });

  let averageTotal30 = 0;
  let averagePerStack30 = 0;
  for (const segment of rotation.segments) {
    const weight = segment.seconds / rotation.horizon;
    const anyBuff = segment.active.length > 0;
    const slice = {
      vulnerable: segment.active.includes('war-cry') ? 1 : 0,
      overpower: segment.overpower ? 1 : 0,
      berserk: segment.active.includes('war-cry') || segment.active.includes('wrath-of-the-berserker') ? 1 : 0,
      unstoppable: segment.unstoppable ? 1 : 0,
      enemyHealthy: 1,
      elites: 1,
      sheetContext: anyBuff ? 'combat-allbuff' : 'combat-nobuff',
      endpoint: 'low',
      extras: extrasFor(simulated, segment.active)
    };
    averageTotal30 += weight * evalSlice(decorate(slice, false), 'total');
    averagePerStack30 += weight * evalSlice(decorate(slice, false), 'perStack');
  }

  const base = soulFactor(30, 'sum', opts.soulRatePct);
  const scale = (souls, model) => soulFactor(souls, model, opts.soulRatePct) / base;
  const targetBillions = build?.combatObservations?.calibration?.peakBillions ?? null;
  const target = typeof targetBillions === 'number' ? targetBillions * 1e9 : null;
  const soulsTable = [];
  for (const souls of SOUL_REPORTS) {
    for (const model of ['sum', 'compound']) {
      const factor = scale(souls, model);
      const peakTotal = peakTotal30 * factor;
      const peakPerStack = peakPerStack30 * factor;
      soulsTable.push({
        souls,
        model,
        factor: soulFactor(souls, model),
        peakTotal,
        peakPerStack,
        averageTotal: averageTotal30 * factor,
        averagePerStack: averagePerStack30 * factor,
        peakTotalBillions: billions(peakTotal),
        peakPerStackBillions: billions(peakPerStack),
        averageTotalBillions: billions(averageTotal30 * factor),
        averagePerStackBillions: billions(averagePerStack30 * factor)
      });
    }
  }
  const at30 = soulsTable.find(row => row.souls === 30 && row.model === 'sum');
  const fullKey = allIds.slice().sort().join('+');
  const fullOverlap = rotation.combinations.find(row => row.ids.join('+') === fullKey) || { seconds: 0, fraction: 0, ids: allIds };

  const nonBoss = (patch, sheetContext, endpoint) => scoreSlice(catalog, build, {
    vulnerable: patch.vulnerable ?? 0,
    overpower: 0,
    berserk: patch.berserk ?? 0,
    unstoppable: 1,
    enemyHealthy: patch.enemyHealthy ?? 0,
    elites: 0,
    sheetContext,
    endpoint,
    extras: []
  }, { souls: 30, soulModel: 'sum', overpowerSheetMeaning: 'total' }).result.total;

  const party = build?.combatObservations?.calibration?.party || null;
  const unexplained = [
    'Party buffs from Subo and Varyana. They were active in the 718B fight, hitting the dummy and using shouts and buffs. Nikolay thinks the contribution is not significant. The model stays solo. Party buffs are a minor possible source. They are not fitted and they are not modeled.',
    'The 841B video read is withdrawn. A second pass reads it as two overlapping numbers with a Dust Devil. No confirmed hit of 800B or more.',
    'Dust Devil hits stay unscored. The damage type and the hit rate are not stored.',
    ...buffs.flatMap(buff => buff.flags),
    'The Berserking keyword 75%[x], and the doubled reading while Wrath is up, are not copied onto a damage effect.',
    cdr.applied
      ? `Sheet Cooldown Reduction ${cdr.pct}% is a video reading${cdr.suspect ? ' marked suspect' : ''}. The timeline uses tooltip × (1 - ${cdr.pct}/100). Gear cooldown-reduction lines are not added on top of that sheet total. The formula is an estimate.`
      : 'No sheet Cooldown Reduction is stored.',
    shoutCut.applied
      ? `Marshal reduces non-Shout cooldowns by ${shoutCut.seconds}s after a Shout. The timeline applies that cut. It is an estimate.`
      : 'Marshal\'s non-Shout cooldown cut is not stored on this build.',
    'The timeline casts every modeled buff together at 0s, then on cooldown. No phase between the skills is stored.',
    'Overpower uses the stored full-stack assumption for the whole Wrath window, plus the stored linger. Partial stacks are not scaled.',
    'Stone of Jordan\'s 10s Vulnerable touch has no touch interval. Vulnerable on the timeline follows War Cry\'s stored 4s.',
    'The Boss Training Dummy is scored as an elite. That is an estimate.',
    'The sustained average keeps the dummy Healthy for the whole window. A boss does not stay Healthy, so this average is the sustained rate while it is Healthy.',
    'War Cry, Wrath, and Challenging Shout\'s Burning line are applied on top of the combat sheet. The sheet was read while buffs were up. Whether those [x] lines are already inside the sheet is unverified.',
    'The All Damage ramp from 1,996% to 9,897.7% is not interpolated. The peak uses the high end. The average uses the low end while any modeled buff is up, and the no-buff sheet when none are.',
    'Grand Skull sockets, the unmatched Deathhead tooltip, Polearm Expertise 10/10, and attack speed 120% stay unscored.'
  ];

  return {
    estimate: true,
    horizon: rotation.horizon,
    cdr,
    shoutCut,
    afterglow,
    overpowerLinger: linger,
    buffs,
    rotation,
    fullOverlap,
    peak: {
      souls: 30,
      model: 'sum',
      reading: 'headline',
      target,
      targetBillions,
      total: peakTotal30,
      perStack: peakPerStack30,
      totalBillions: billions(peakTotal30),
      perStackBillions: billions(peakPerStack30),
      totalRatio: target ? peakTotal30 / target : null,
      perStackRatio: target ? peakPerStack30 / target : null
    },
    average: {
      souls: 30,
      model: 'sum',
      total: averageTotal30,
      perStack: averagePerStack30,
      totalBillions: billions(averageTotal30),
      perStackBillions: billions(averagePerStack30)
    },
    soulsTable,
    at30,
    nonBoss: {
      nobuffMid: nonBoss({}, 'combat-nobuff', 'low'),
      nobuffHealthy: nonBoss({ enemyHealthy: 1 }, 'combat-nobuff', 'low'),
      allbuffHealthy: nonBoss({ enemyHealthy: 1, vulnerable: 1, berserk: 1 }, 'combat-allbuff', 'high')
    },
    partyModeled: false,
    party,
    unexplained,
    notes: rotation.notes,
    peakScore: {
      total: peakScore.result.total,
      overpowerBucket: peakScore.result.buckets.overpower,
      overpowerPct: peakScore.input.overpowerPct,
      overpowerAdditive: peakScore.input.modifiers.find(mod => mod.name === 'Overpower Damage')?.value ?? null,
      modifiers: peakScore.input.modifiers.filter(mod => mod.kind === 'skill' && ['war-cry', 'challenging-shout', 'wrath-of-the-berserker'].includes(mod.id)).map(mod => ({ id: mod.id, value: mod.value, bucket: mod.bucket }))
    },
    peakWithoutAssumed: peakWithoutAssumed.result.total
  };
}
