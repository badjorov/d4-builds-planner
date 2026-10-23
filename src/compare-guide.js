import { resolveCritReading, resolveOverpowerMeaning, resolveSoulModel } from './catalog.js';
import { rotationReport } from './rotation.js';

export const GUIDE_ID = 'ww-d4builds-immortal-speed-130';
export const GUIDE_SOURCE = 'https://d4builds.gg/builds/whirlwind-barbarian-endgame/?var=4';
export const GUIDE_UNIQUE_SOURCE = 'd4-guide-uniques.md';

const DIRECT_SLOTS = [
  ['helm', 'helm', 'Helm'],
  ['chest', 'chest', 'Chest'],
  ['gloves', 'gloves', 'Gloves'],
  ['pants', 'pants', 'Pants'],
  ['boots', 'boots', 'Boots'],
  ['amulet', 'amulet', 'Amulet'],
  ['weapon-1', 'slashing', '2H Slashing'],
  ['weapon-2', 'bludgeoning', '2H Bludgeoning'],
  ['weapon-3', 'dualWield1', 'Dual wield 1'],
  ['weapon-4', 'dualWield2', 'Dual wield 2']
];

const UNIQUE_IDS = {
  starless: 'ring-of-starless-skies',
  tuskhelm: 'tuskhelm-of-joritz-the-mighty-unique',
  bloodMad: 'blood-mad-idol',
  furnace: 'the-furnace'
};

function norm(value) {
  return String(value || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(value) {
  return norm(value).replace(/ /g, '');
}

function findNamed(list, guideName) {
  const key = norm(guideName);
  const exact = (list || []).find(item => norm(item.name) === key);
  if (exact) return { item: exact, loose: false };
  const loose = (list || []).find(item => {
    const name = norm(item.name);
    return name && (key.startsWith(`${name} `) || name.startsWith(`${key} `));
  });
  return loose ? { item: loose, loose: true } : { item: null, loose: false };
}

export function resolveGuideItem(catalog, guideName) {
  const lists = [
    ['unique', catalog.uniques],
    ['aspect', catalog.aspects],
    ['talisman', catalog.talismans]
  ];
  for (const [kind, list] of lists) {
    const found = findNamed(list, guideName);
    if (found.item) {
      return { kind, id: found.item.id, name: found.item.name, catalog: true, loose: found.loose };
    }
  }
  return { kind: null, id: null, name: guideName, catalog: false, loose: false };
}

function slotIdentity(catalog, slot) {
  if (slot?.uniqueId) {
    const unique = (catalog.uniques || []).find(item => item.id === slot.uniqueId);
    return { kind: 'unique', id: slot.uniqueId, name: unique?.name || slot.itemName || slot.uniqueId };
  }
  if (slot?.aspectId) {
    const aspect = (catalog.aspects || []).find(item => item.id === slot.aspectId);
    return { kind: 'aspect', id: slot.aspectId, name: aspect?.name || slot.itemName || slot.aspectId };
  }
  return { kind: null, id: null, name: slot?.itemName || null };
}

function sameEntity(left, right) {
  return !!left?.id && left.kind === right?.kind && left.id === right?.id && left.kind !== 'talisman';
}

function withGuideItem(build, slotId, guideName, resolved) {
  const next = structuredClone(build);
  const slot = next.gear.find(item => item.slotId === slotId);
  slot.itemName = guideName;
  slot.uniqueId = resolved.kind === 'unique' ? resolved.id : null;
  slot.aspectId = resolved.kind === 'aspect' ? resolved.id : null;
  slot.affixes = [];
  return next;
}

function uniqueById(catalog, id) {
  return (catalog.uniques || []).find(item => item.id === id) || null;
}

function splinterEntity(catalog) {
  return (catalog.seasonalMechanics || []).find(item => item.id === 'splinter-of-the-black-soulstone') || null;
}

function boostedSoulRate(catalog) {
  const effect = (splinterEntity(catalog)?.effects || []).find(item => item.kind === 'damage' && item.scored !== false && /per soul/i.test(item.stat || '') && !/unboosted/i.test(item.stat || ''));
  return typeof effect?.value === 'number' ? effect.value : null;
}

function unboostedSoulRate(catalog) {
  const effect = (splinterEntity(catalog)?.effects || []).find(item => item.kind === 'damage' && item.scored === false && /unboosted/i.test(item.stat || ''));
  return typeof effect?.value === 'number' ? effect.value : null;
}

function damageRoll(unique) {
  const effect = (unique?.effects || []).find(item => item.kind === 'damage' && Array.isArray(item.range));
  if (!effect || typeof effect.range[0] !== 'number' || typeof effect.range[1] !== 'number') {
    throw new Error(`${unique?.id || 'unique'} has no stored damage range`);
  }
  return { min: effect.range[0], max: effect.range[1], stat: effect.stat };
}

function effectValue(unique, pattern) {
  const effect = (unique?.effects || []).find(item => pattern.test(item.stat || '') && typeof item.value === 'number');
  return effect?.value ?? null;
}

function calibratedRows(catalog, build) {
  const report = rotationReport(catalog, build);
  return [15, 30].map(souls => {
    const row = report.soulsTable.find(item => item.souls === souls && item.model === 'sum');
    return {
      souls,
      model: 'sum',
      peakTotal: row.peakTotal,
      averageTotal: row.averageTotal
    };
  });
}

function ratio(next, base) {
  return base ? next / base : null;
}

function damageMod(name, id, value, bucket) {
  const mod = { name, id, bucket, value, active: true, kind: 'unique', estimate: true };
  if (bucket === 'additive') mod.sheetConditional = true;
  return mod;
}

function linesFor(spec, flags, slice, info) {
  const end = spec.end;
  const lines = [];
  if (flags.starless) {
    lines.push(damageMod('Ring of Starless Skies', UNIQUE_IDS.starless, spec.rolls.starless[end], 'multiplicative'));
  }
  if (flags.tuskhelm && slice.berserk === 1) {
    lines.push(damageMod(
      'Tuskhelm of Joritz the Mighty',
      UNIQUE_IDS.tuskhelm,
      spec.rolls.tuskhelm[end],
      spec.additive ? 'additive' : 'multiplicative'
    ));
  }
  if (flags.bloodMad) {
    lines.push(damageMod(
      'Blood-Mad Idol',
      UNIQUE_IDS.bloodMad,
      spec.rolls.bloodMad[end],
      spec.additive ? 'additive' : 'multiplicative'
    ));
  }
  if (flags.furnace) {
    const weight = info.peak ? 1 : spec.eliteShare;
    lines.push(damageMod('The Furnace', UNIQUE_IDS.furnace, spec.rolls.furnace[end] * weight, 'multiplicative'));
  }
  return lines;
}

function scoreProfile(catalog, build, spec, flags) {
  const report = rotationReport(catalog, build, {
    soulRatePct: flags.soulRatePct,
    extraCdrPct: flags.extraCdrPct || 0,
    forceBerserk: flags.forceBerserk === true,
    extraModifiersFor: (slice, info) => linesFor(spec, flags, slice, info)
  });
  return [15, 30].map(souls => {
    const row = report.soulsTable.find(item => item.souls === souls && item.model === 'sum');
    return { souls, model: 'sum', peakTotal: row.peakTotal, averageTotal: row.averageTotal };
  });
}

function variantsOf(rolls, eliteShare) {
  return [
    { id: 'min', end: 'min', additive: false, rolls, eliteShare },
    { id: 'max', end: 'max', additive: false, rolls, eliteShare },
    { id: 'additive-min', end: 'min', additive: true, rolls, eliteShare },
    { id: 'additive-max', end: 'max', additive: true, rolls, eliteShare }
  ];
}

function scoreSet(catalog, build, variants, flags) {
  const out = {};
  for (const spec of variants) {
    const berserkLine = flags.tuskhelm || flags.bloodMad;
    if (!berserkLine && spec.additive) {
      out[spec.id] = spec.end === 'max' ? out.max : out.min;
      continue;
    }
    out[spec.id] = scoreProfile(catalog, build, spec, flags);
  }
  return out;
}

function at(rows, souls, field) {
  return rows.find(row => row.souls === souls)[field];
}

function pack(scored, base) {
  const one = rows => ({
    peak: ratio(at(rows, 30, 'peakTotal'), at(base, 30, 'peakTotal')),
    average: ratio(at(rows, 30, 'averageTotal'), at(base, 30, 'averageTotal'))
  });
  return {
    min: one(scored.min),
    max: one(scored.max),
    additiveMin: one(scored['additive-min']),
    additiveMax: one(scored['additive-max'])
  };
}

const ONES = { peak: 1, average: 1 };
const ONE_SET = { min: ONES, max: ONES, additiveMin: ONES, additiveMax: ONES };

function slotNote(slotId, guideName, identity) {
  if (slotId === 'helm') {
    return 'Tuskhelm replaces Leoric\'s Crown. The helm is not jewelry, so this row uses the unboosted 2.5%[x] per soul. The 10% Cooldown Reduction multiplies the remaining cooldown after the sheet 39.4%. The [40-50]%[x] line is on for the all-buff peak and follows War Cry or Wrath on the average. That Berserk match is an estimate. The additive columns move the same percents into the additive pool.';
  }
  if (slotId === 'weapon-3' && /\bmace\b/i.test(guideName)) {
    return 'The guide names Spirit as a 1H mace. Nikolay\'s stored Spirit is a 1H sword. No separate mace damage number is stored, so the score uses the same unique.';
  }
  if (slotId === 'weapon-2' && identity.kind === 'aspect') {
    return 'The guide names Aspect of Channeling on a 2H mace. Nikolay\'s item is Deathshead of Channeling, a 2H mace, with that aspect. The Furnace is also a 2H mace, and the recorded guide lists it as a charm, so this weapon stays Aspect of Channeling.';
  }
  if (/starless/i.test(guideName)) {
    return 'Ring of Starless Skies spends Primary Resource for 10%[x] damage for 3s, up to 50%[x]. Whirlwind channels constantly, so the min column is one stack and the max column is the cap. Stack uptime is an estimate. The resource-cost amount is null. The line removed with Stone of Jordan is 23%[x] damage of the highest element.';
  }
  return null;
}

function pairRings(catalog, nikolay, guide) {
  const slots = ['ring-1', 'ring-2'].map(slotId => nikolay.gear.find(item => item.slotId === slotId));
  const guideRings = [
    { slotLabel: 'Ring 1', guideKey: 'ring1', name: guide.gear.ring1 },
    { slotLabel: 'Ring 2', guideKey: 'ring2', name: guide.gear.ring2 }
  ].map(entry => ({ ...entry, resolved: resolveGuideItem(catalog, entry.name) }));
  const used = new Set();
  const pairs = [];
  for (const slot of slots) {
    const identity = slotIdentity(catalog, slot);
    const index = guideRings.findIndex((item, itemIndex) => !used.has(itemIndex) && sameEntity(identity, item.resolved));
    if (index >= 0) {
      used.add(index);
      pairs.push({ slot, guide: guideRings[index], identity, same: true });
    }
  }
  const openSlots = slots.filter(slot => !pairs.some(pair => pair.slot === slot));
  const openGuide = guideRings.filter((_, index) => !used.has(index));
  for (let index = 0; index < openSlots.length; index += 1) {
    pairs.push({
      slot: openSlots[index],
      guide: openGuide[index],
      identity: slotIdentity(catalog, openSlots[index]),
      same: false
    });
  }
  return pairs;
}

function directSlots(catalog, nikolay, guide) {
  return DIRECT_SLOTS.map(([slotId, guideKey, label]) => {
    const slot = nikolay.gear.find(item => item.slotId === slotId);
    const guideName = guide.gear[guideKey];
    const resolved = resolveGuideItem(catalog, guideName);
    const identity = slotIdentity(catalog, slot);
    return { slot, label, guideKey, guideName, resolved, identity, same: sameEntity(identity, resolved) };
  });
}

function listDiff(left, right) {
  const has = new Set(right.map(compact));
  return left.filter(name => !has.has(compact(name)));
}

function paragonSame(nikolay, guide) {
  const guidePairs = (guide.paragon || []).map(([board, glyph]) => ({ board, glyph }));
  const glyphIds = (nikolay.glyphs || []).map(item => item.glyphId);
  const guideGlyphs = guidePairs.map(pair => pair.glyph);
  const boardsMatch = guidePairs.every(pair => (nikolay.boards || []).some(board => compact(board.name) === compact(pair.board)));
  const glyphsMatch = guideGlyphs.every(name => glyphIds.some(id => compact(id) === compact(name))) && glyphIds.length === guideGlyphs.length;
  return {
    same: boardsMatch && glyphsMatch && guidePairs.length === (nikolay.boards || []).length,
    guidePairs,
    levels: (nikolay.glyphs || []).map(item => ({ glyphId: item.glyphId, level: item.level }))
  };
}

export function compareGuide(catalog, buildsFile, metaFile) {
  const nikolay = (buildsFile.builds || []).find(build => build.id === 'users-current-build');
  const guide = (metaFile.builds || []).find(build => build.id === GUIDE_ID);
  const defaults = {
    soulModel: resolveSoulModel(nikolay, {}),
    overpowerSheetMeaning: resolveOverpowerMeaning(nikolay, {}),
    critReading: resolveCritReading(nikolay, {})
  };
  const rolls = {
    starless: damageRoll(uniqueById(catalog, UNIQUE_IDS.starless)),
    tuskhelm: damageRoll(uniqueById(catalog, UNIQUE_IDS.tuskhelm)),
    bloodMad: damageRoll(uniqueById(catalog, UNIQUE_IDS.bloodMad)),
    furnace: damageRoll(uniqueById(catalog, UNIQUE_IDS.furnace))
  };
  const tuskhelm = uniqueById(catalog, UNIQUE_IDS.tuskhelm);
  const furnace = uniqueById(catalog, UNIQUE_IDS.furnace);
  const soulBoosted = boostedSoulRate(catalog);
  const soulBase = unboostedSoulRate(catalog);
  const extraCdrPct = effectValue(tuskhelm, /cooldown reduction/i);
  const eliteShare = typeof nikolay.uptime?.elites === 'number' ? nikolay.uptime.elites : null;
  const variants = variantsOf(rolls, eliteShare);
  const nikolayRows = calibratedRows(catalog, nikolay);

  const direct = directSlots(catalog, nikolay, guide);
  const rings = pairRings(catalog, nikolay, guide);
  const ringRows = rings.map(pair => ({
    slot: pair.slot,
    label: pair.slot.slotId === 'ring-1' ? 'Ring 1' : 'Ring 2',
    guideKey: pair.guide.guideKey,
    guideName: pair.guide.name,
    resolved: pair.guide.resolved,
    identity: pair.identity,
    same: pair.same,
    guideSlotLabel: pair.guide.slotLabel
  }));
  const rows = [...direct, ...ringRows];
  let guideBuild = structuredClone(nikolay);
  for (const swap of rows.filter(row => !row.same)) {
    guideBuild = withGuideItem(guideBuild, swap.slot.slotId, swap.guideName, swap.resolved);
  }
  guideBuild.id = guide.id;
  guideBuild.name = guide.name;
  guideBuild.talismans = [...(guide.seasonal?.charms || [])];

  const fullFlags = {
    starless: true,
    tuskhelm: true,
    bloodMad: true,
    furnace: true,
    soulRatePct: soulBase,
    extraCdrPct,
    forceBerserk: true
  };
  const guideVariants = scoreSet(catalog, guideBuild, variants, fullFlags);
  const full = pack(guideVariants, nikolayRows);

  const swapScores = new Map();
  for (const swap of rows.filter(row => !row.same)) {
    const swapped = withGuideItem(nikolay, swap.slot.slotId, swap.guideName, swap.resolved);
    const helm = swap.slot.slotId === 'helm';
    const starless = /starless/i.test(swap.guideName);
    swapScores.set(swap.slot.slotId, scoreSet(catalog, swapped, variants, {
      tuskhelm: helm,
      starless,
      soulRatePct: helm ? soulBase : undefined,
      extraCdrPct: helm ? extraCdrPct : 0,
      forceBerserk: false
    }));
  }
  const charmScores = {
    bloodMad: scoreSet(catalog, nikolay, variants, { bloodMad: true, forceBerserk: true }),
    furnace: scoreSet(catalog, nikolay, variants, { furnace: true })
  };

  const slots = rows.map(row => {
    const scored = row.same ? null : swapScores.get(row.slot.slotId);
    return {
      slotId: row.slot.slotId,
      label: row.label,
      nikolayName: row.identity.name,
      guideName: row.guideName,
      guideSlotLabel: row.guideSlotLabel || row.label,
      same: row.same,
      catalogKind: row.resolved.kind,
      catalogId: row.resolved.id,
      invented: false,
      additiveApplies: row.slot.slotId === 'helm',
      assumption: row.same
        ? 'The guide states no roll for this item. The item matches, so Nikolay\'s stored rolls are used. Assumption.'
        : 'The guide states no affix rolls for this item. Nikolay\'s affixes on the replaced item are not copied. No roll is invented. Assumption.',
      note: slotNote(row.slot.slotId, row.guideName, row.identity),
      multipliers: row.same ? ONE_SET : pack(scored, nikolayRows)
    };
  });
  const order = ['helm', 'chest', 'gloves', 'pants', 'boots', 'amulet', 'ring-1', 'ring-2', 'weapon-1', 'weapon-2', 'weapon-3', 'weapon-4'];
  slots.sort((a, b) => order.indexOf(a.slotId) - order.indexOf(b.slotId));

  const charms = [
    {
      slotId: 'charm-blood-mad',
      label: 'Charm',
      nikolayName: '—',
      guideName: 'Blood-Mad Idol',
      guideSlotLabel: 'charm',
      same: false,
      catalogKind: 'unique',
      catalogId: UNIQUE_IDS.bloodMad,
      invented: false,
      additiveApplies: true,
      note: 'Always Berserking, so the guide row and this isolated charm keep Berserk on for the whole timeline. The additional damage uses min 75 and max 150. Low confidence. The 200%[x] self-burn is damage taken over 8s and is not scored. Burning on the player does not turn on the vs Burning target line. The additive columns move 75 and 150 into the additive pool.',
      multipliers: pack(charmScores.bloodMad, nikolayRows)
    },
    {
      slotId: 'charm-furnace',
      label: 'Charm',
      nikolayName: '—',
      guideName: 'The Furnace',
      guideSlotLabel: 'charm',
      same: false,
      catalogKind: 'unique',
      catalogId: UNIQUE_IDS.furnace,
      invented: false,
      additiveApplies: false,
      catalogSlots: furnace?.slots || [],
      replacesWeapon: false,
      note: `The Furnace is a 2H mace. The catalog slot is ${(furnace?.slots || []).join(', ') || 'unset'}. The recorded guide lists it as a charm and keeps Aspect of Channeling on 2H Bludgeoning, so it does not replace a weapon. Min 75 and max 200, low confidence. The peak uses elite 1. The average weights the percent by the stored elite share ${eliteShare}.`,
      multipliers: pack(charmScores.furnace, nikolayRows)
    }
  ];

  const missingGear = slots.filter(slot => !slot.same).map(slot => ({
    name: slot.guideName,
    where: slot.guideSlotLabel && slot.guideSlotLabel !== slot.label ? `${slot.guideSlotLabel} on the guide` : slot.label
  }));
  const missingCharms = listDiff(guide.seasonal?.charms || [], nikolay.talismans || []).map(name => ({ name, where: 'charm' }));
  const hisGear = slots.filter(slot => !slot.same).map(slot => ({
    name: slot.nikolayName,
    where: slot.label,
    multipliers: slot.multipliers
  }));
  const hisCharms = listDiff(nikolay.talismans || [], guide.seasonal?.charms || []).map(name => ({
    name,
    where: 'charm',
    multipliers: null
  }));
  const paragon = paragonSame(nikolay, guide);
  const skillsSame = (guide.skills || []).every(id => (nikolay.skills || []).includes(id)) && guide.skills.length === nikolay.skills.length;
  const runesSame = (guide.seasonal?.runes || []).every(name => (nikolay.runes || []).includes(name)) && (guide.seasonal?.runes || []).length === (nikolay.runes || []).length;
  const assumptions = [
    'The guide states no affix rolls, glyph levels, or masterwork values. Where the item is the same, Nikolay\'s stored rolls are used. Assumption.',
    `Glyph levels stay Nikolay's stored levels: ${paragon.levels.map(item => `${item.glyphId} ${item.level}`).join(', ')}. The guide states no glyph level. Assumption.`,
    'Paragon nodes inside each board stay Nikolay\'s stored nodes. The recorded guide lists the board and the glyph only. Assumption.',
    'Both rows use Nikolay\'s combat-allbuff sheet, weapon damage, strength, and the 60s buff timeline. The guide states none of those numbers. Assumption.',
    `Nikolay's row keeps the screenshot soul rate ${soulBoosted}%[x], sum model. The guide helm is Tuskhelm, which does not count as jewelry, so the guide row uses the unboosted ${soulBase}%[x] per soul. That guide rate is an estimate.`,
    `Tuskhelm's ${extraCdrPct}% Cooldown Reduction multiplies the remaining cooldown after sheet 39.4% on any row that equips that helm. It is not inside Nikolay's sheet. Estimate.`,
    'Changed slots do not receive the replaced item\'s affixes. No roll is invented. Starless, Tuskhelm, Blood-Mad Idol, and The Furnace use the ranges stored from d4-guide-uniques.md.',
    'Starless stack uptime is an estimate. The tooltip is high confidence: 10%[x] for 3s, up to 50%[x]. The resource-cost amount stays null.',
    'Tuskhelm\'s Berserk line is on for the all-buff peak. The average follows War Cry or Wrath unless Blood-Mad Idol forces Berserk on for the whole timeline. That uptime is an estimate. 6 Fury per second is not converted into damage.',
    'Blood-Mad Idol\'s additional damage uses min 75 and max 150 because the sources conflict. Low confidence. The 8s self-burn has no refresh interval, so the line is on for the whole window. That is an estimate. The 200%[x] is damage taken and does not turn on the vs Burning target line.',
    `The Furnace average uses elite share ${eliteShare}, an estimate. The boss-dummy peak uses elite 1. The recorded guide places The Furnace on the charm list, not in the 2H Bludgeoning slot.`,
    'Patch 3.1 notes say some while-Berserking [x] bonuses were additive, and the items were not named. The additive columns score Tuskhelm and Blood-Mad Idol in the additive pool. Starless and The Furnace stay [x].',
    'Leoric\'s Crown database ranges of 35-50 or 75-100 are recorded on the gem note. The screenshot +65%[x] stays the stored boost.',
    'The guide names Spirit as a 1H mace. Nikolay\'s stored Spirit is a 1H sword. No separate mace damage number is stored.',
    'The four unique entries cite d4-guide-uniques.md. The note\'s source URLs were not in the workspace, so no URL is invented. Season 15, patch 3.2.3. Verified stays false.'
  ];
  return {
    source: guide.source || GUIDE_SOURCE,
    uniqueSource: GUIDE_UNIQUE_SOURCE,
    guideId: guide.id,
    guideName: guide.name,
    recordedOn: guide.recordedOn,
    author: guide.author,
    updated: guide.updated,
    defaults,
    context: 'combat-allbuff',
    timeline: 'the stored 60s buff timeline',
    soulRates: { nikolay: soulBoosted, guide: soulBase },
    extraCdrPct,
    eliteShare,
    rolls,
    nikolay: { id: nikolay.id, name: nikolay.name, rows: nikolayRows },
    guideScores: {
      id: guide.id,
      name: guide.name,
      variants: guideVariants
    },
    full,
    slots,
    charms,
    missing: [...missingGear, ...missingCharms],
    hisChoices: [...hisGear, ...hisCharms],
    skillsSame,
    runesSame,
    expertiseSame: nikolay.expertise === guide.expertise,
    paragon,
    assumptions
  };
}

function billionsText(total) {
  const rounded = Math.round(total / 1e7) / 100;
  const [whole, frac] = rounded.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}B`;
}

function factorText(value) {
  if (value == null) return 'unscored';
  return `×${value.toFixed(4)}`;
}

function readingRows(report, key) {
  const rows = key === 'nikolay' ? report.nikolay.rows : report.guideScores.variants[key];
  return [15, 30].map(souls => rows.find(row => row.souls === souls));
}

export function renderGuideComparison(report) {
  const labels = [
    ['nikolay', 'Nikolay'],
    ['min', 'Guide min'],
    ['max', 'Guide max'],
    ['additive-min', 'Guide additive min'],
    ['additive-max', 'Guide additive max']
  ];
  const lines = [
    '# Whirlwind guide variant 4 vs Nikolay\'s build',
    '',
    `The guide is the recorded row \`${report.guideId}\` in \`data/meta-builds.json\`. Source: ${report.source}. Author ${report.author}, updated ${report.updated}, recorded ${report.recordedOn}. That row is names and the link. This comparison uses those recorded names.`,
    '',
    `The four guide uniques are manual entries from \`${report.uniqueSource}\` (Research Scout), Season 15, patch 3.2.3. The note's source URLs were not in the workspace, so no URL is invented. Each value is an estimate and stays unverified.`,
    '',
    `The score uses the locked defaults. Souls use the sum \`1 + rate × souls\`. Nikolay's rate is ${report.soulRates.nikolay}%[x]. The guide rate is ${report.soulRates.guide}%[x], because Tuskhelm does not count as jewelry and the splinter is not gem-boosted. \`overpowerSheetMeaning\` is \`total\`. \`critAudit.reading\` is \`headline\`. Those defaults are calibrated against the 718B boss-dummy hit at 30 souls (peak 784B with the Burning line, 653B without it; average 341B). Both builds use the combat-allbuff sheet and the same 60s buff timeline. The peak is the full overlap on the high end of the All Damage ramp. The sustained average weights that timeline. The guide states no sheet, so both rows use Nikolay's sheet.`,
    '',
    'Min uses Starless 10%[x], Tuskhelm 40, Blood-Mad Idol 75, and The Furnace 75. Max uses Starless 50%[x], Tuskhelm 50, Blood-Mad Idol 150, and The Furnace 200. The additive readings move the Tuskhelm and Blood-Mad Idol percents into the additive pool. Starless and The Furnace stay [x].',
    '',
    '## Scores',
    '',
    '| Reading | Souls | Peak | Sustained average |',
    '| --- | ---: | ---: | ---: |'
  ];
  for (const [key, label] of labels) {
    for (const row of readingRows(report, key)) {
      lines.push(`| ${label} | ${row.souls} | ${billionsText(row.peakTotal)} | ${billionsText(row.averageTotal)} |`);
    }
  }
  lines.push(
    '',
    `On the full guide loadout, the 30-soul peak runs from ${factorText(report.full.min.peak)} at the min reading to ${factorText(report.full.max.peak)} at the max reading. The additive readings are ${factorText(report.full.additiveMin.peak)} and ${factorText(report.full.additiveMax.peak)}. The sustained average runs from ${factorText(report.full.min.average)} to ${factorText(report.full.max.average)}, and the additive average readings are ${factorText(report.full.additiveMin.average)} and ${factorText(report.full.additiveMax.average)}.`,
    '',
    'At the peak every compared line is on, so the [x] peak is the product of the isolated peak factors. The average is not that product. Blood-Mad Idol keeps Berserk on outside the War Cry and Wrath windows, which also keeps the Tuskhelm line on, and The Furnace average uses the stored elite share. The additive readings join the combat-allbuff pool, so 40 to 150 additive is a small change beside All Damage and Overpower Damage.',
    '',
    '## Per-slot diff',
    '',
    'The multiplier is the 30-soul score after that one change, divided by Nikolay\'s score. A factor below 1 means his item scores higher on that reading. Helm includes the unboosted soul rate and the 10% Cooldown Reduction. The charm rows are isolated. The other gear slots stay ×1.0000.',
    '',
    '| Slot | Nikolay | Guide | Peak min | Peak max | Peak additive min | Peak additive max | Average min | Average max | Average additive min | Average additive max |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  );
  const shown = [...report.slots, ...report.charms];
  for (const slot of shown) {
    const guideLabel = slot.guideSlotLabel && slot.guideSlotLabel !== slot.label ? `${slot.guideName} (${slot.guideSlotLabel})` : slot.guideName;
    const set = slot.multipliers;
    lines.push(`| ${slot.label} | ${slot.nikolayName} | ${guideLabel} | ${factorText(set.min.peak)} | ${factorText(set.max.peak)} | ${factorText(set.additiveMin.peak)} | ${factorText(set.additiveMax.peak)} | ${factorText(set.min.average)} | ${factorText(set.max.average)} | ${factorText(set.additiveMin.average)} | ${factorText(set.additiveMax.average)} |`);
  }
  lines.push('', 'Crushing Aspect is on both builds. The guide lists it on ring 1 and Ring of Starless Skies on ring 2. Nikolay lists Stone of Jordan on ring 1 and Crushing Aspect on ring 2. The scored swap keeps Crushing Aspect and replaces Stone of Jordan.');
  lines.push('', 'Notes on the rows that need one:');
  lines.push('');
  for (const slot of shown.filter(slot => slot.note)) {
    lines.push(`- ${slot.label === 'Charm' ? slot.guideName : slot.label}: ${slot.note}`);
  }
  lines.push('', '## Guide items he is missing', '');
  for (const item of report.missing) lines.push(`- ${item.name} (${item.where})`);
  lines.push('', '## Which side scores higher', '');
  lines.push('Isolated 30-soul factors below 1 mean his side scores higher on that reading.');
  lines.push('');
  for (const slot of report.slots.filter(slot => !slot.same)) {
    const additive = slot.additiveApplies
      ? ` The additive peak is ${factorText(slot.multipliers.additiveMin.peak)} and ${factorText(slot.multipliers.additiveMax.peak)}.`
      : '';
    lines.push(`- ${slot.nikolayName} against ${slot.guideName}: peak ${factorText(slot.multipliers.min.peak)} to ${factorText(slot.multipliers.max.peak)}, average ${factorText(slot.multipliers.min.average)} to ${factorText(slot.multipliers.max.average)}.${additive}`);
  }
  for (const charm of report.charms) {
    const additive = charm.additiveApplies
      ? ` The additive peak is ${factorText(charm.multipliers.additiveMin.peak)} to ${factorText(charm.multipliers.additiveMax.peak)}.`
      : '';
    lines.push(`- ${charm.guideName} is not on his build. Adding it multiplies the peak by ${factorText(charm.multipliers.min.peak)} to ${factorText(charm.multipliers.max.peak)} and the average by ${factorText(charm.multipliers.min.average)} to ${factorText(charm.multipliers.max.average)}.${additive}`);
  }
  const ties = report.hisChoices.filter(item => !item.multipliers);
  if (ties.length) {
    lines.push('');
    lines.push('His other choices are not on the guide. They do not change this score:');
    lines.push('');
    for (const item of ties) lines.push(`- ${item.name} (${item.where})`);
  }
  lines.push('', '## Same choices', '');
  lines.push(`Skills are the same six: Whirlwind, War Cry, Challenging Shout, Rallying Cry, Wrath of the Berserker, and Iron Skin. ${report.skillsSame ? 'They match.' : 'They differ.'}`);
  lines.push(`Runes are Igni, Ohm, Bac, and Mot on both. ${report.runesSame ? 'They match.' : 'They differ.'}`);
  lines.push(`Expertise is polearm on both. ${report.expertiseSame ? 'They match.' : 'They differ.'}`);
  lines.push(`Paragon boards and glyphs match by name: ${report.paragon.guidePairs.map(pair => `${pair.board} / ${pair.glyph}`).join('; ')}. ${report.paragon.same ? 'They match.' : 'They differ.'}`);
  lines.push('', '## Assumptions', '');
  for (const item of report.assumptions) lines.push(`- ${item}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
