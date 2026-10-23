import { resolveCritReading, resolveOverpowerMeaning, resolveSoulModel } from './catalog.js';
import { rotationReport } from './rotation.js';

export const GUIDE_ID = 'ww-d4builds-immortal-speed-130';
export const GUIDE_SOURCE = 'https://d4builds.gg/builds/whirlwind-barbarian-endgame/?var=4';

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

function calibratedRows(catalog, build) {
  const report = rotationReport(catalog, build);
  return [15, 30].map(souls => {
    const row = report.soulsTable.find(item => item.souls === souls && item.model === 'sum');
    return {
      souls,
      model: 'sum',
      peakTotal: row.peakTotal,
      averageTotal: row.averageTotal,
      peakTotalBillions: row.peakTotalBillions,
      averageTotalBillions: row.averageTotalBillions
    };
  });
}

function ratio(next, base) {
  return base ? next / base : null;
}

function slotNote(slotId, guideName, resolved, identity, catalog) {
  if (slotId === 'helm') {
    return 'Tuskhelm is stored as a charm. Its damage line has no bucket, so the helm name adds no multiplier. Leoric\'s helm copy of the per-soul line is scored on the splinter, not on the helm.';
  }
  if (slotId === 'weapon-3' && /\bmace\b/i.test(guideName)) {
    return 'The guide names Spirit as a 1H mace. Nikolay\'s stored Spirit is a 1H sword. No separate mace damage number is stored, so the score uses the same unique.';
  }
  if (slotId === 'weapon-2' && identity.kind === 'aspect') {
    return 'The guide names Aspect of Channeling on a 2H mace. Nikolay\'s item is Deathshead of Channeling, a 2H mace, with that aspect.';
  }
  if (!resolved.catalog) {
    const removed = identity?.id === 'stone-of-jordan'
      ? (catalog.uniques || []).find(item => item.id === 'stone-of-jordan')?.effects?.find(effect => effect.kind === 'damage' && effect.bucket === 'multiplicative')
      : null;
    const removedText = removed ? ` The scored line removed with ${identity.name} is ${removed.value}%[x] ${removed.stat}.` : '';
    return `${guideName} is a recorded name. The catalog has no effect for it, so no multiplier is invented.${removedText}`;
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
    return {
      slot,
      label,
      guideKey,
      guideName,
      resolved,
      identity,
      same: sameEntity(identity, resolved)
    };
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
  const swaps = rows.filter(row => !row.same);
  const swapScores = new Map();
  for (const swap of swaps) {
    const swapped = withGuideItem(nikolay, swap.slot.slotId, swap.guideName, swap.resolved);
    swapScores.set(swap.slot.slotId, calibratedRows(catalog, swapped));
  }
  let guideBuild = structuredClone(nikolay);
  for (const swap of swaps) guideBuild = withGuideItem(guideBuild, swap.slot.slotId, swap.guideName, swap.resolved);
  guideBuild.id = guide.id;
  guideBuild.name = guide.name;
  guideBuild.talismans = [...(guide.seasonal?.charms || [])];
  const nikolayRows = calibratedRows(catalog, nikolay);
  const guideRows = calibratedRows(catalog, guideBuild);
  const slots = rows.map(row => {
    const scored = row.same ? null : swapScores.get(row.slot.slotId);
    const peak = row.same ? 1 : ratio(scored[1].peakTotal, nikolayRows[1].peakTotal);
    const average = row.same ? 1 : ratio(scored[1].averageTotal, nikolayRows[1].averageTotal);
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
      assumption: row.same
        ? 'The guide states no roll for this item. The item matches, so Nikolay\'s stored rolls are used. Assumption.'
        : 'The guide states no rolls for this item. Nikolay\'s affixes on the replaced item are not copied. No roll is invented. Assumption.',
      note: slotNote(row.slot.slotId, row.guideName, row.resolved, row.identity, catalog),
      swapMultiplierPeak: peak,
      swapMultiplierAverage: average
    };
  });
  const order = ['helm', 'chest', 'gloves', 'pants', 'boots', 'amulet', 'ring-1', 'ring-2', 'weapon-1', 'weapon-2', 'weapon-3', 'weapon-4'];
  slots.sort((a, b) => order.indexOf(a.slotId) - order.indexOf(b.slotId));
  const at = (list, souls) => list.find(row => row.souls === souls);
  const fullPeak = ratio(at(guideRows, 30).peakTotal, at(nikolayRows, 30).peakTotal);
  const fullAverage = ratio(at(guideRows, 30).averageTotal, at(nikolayRows, 30).averageTotal);
  const missingGear = slots.filter(slot => !slot.same).map(slot => ({
    name: slot.guideName,
    where: slot.guideSlotLabel && slot.guideSlotLabel !== slot.label ? `${slot.guideSlotLabel} on the guide` : slot.label
  }));
  const missingCharms = listDiff(guide.seasonal?.charms || [], nikolay.talismans || []).map(name => ({ name, where: 'charm' }));
  const hisGear = slots.filter(slot => !slot.same).map(slot => ({
    name: slot.nikolayName,
    where: slot.label,
    beats: slot.swapMultiplierPeak < 1 - 1e-9,
    multiplier: slot.swapMultiplierPeak
  }));
  const hisCharms = listDiff(nikolay.talismans || [], guide.seasonal?.charms || []).map(name => ({
    name,
    where: 'charm',
    beats: false,
    multiplier: null
  }));
  const paragon = paragonSame(nikolay, guide);
  const skillsSame = (guide.skills || []).every(id => (nikolay.skills || []).includes(id)) && guide.skills.length === nikolay.skills.length;
  const runesSame = (guide.seasonal?.runes || []).every(name => (nikolay.runes || []).includes(name)) && (guide.seasonal?.runes || []).length === (nikolay.runes || []).length;
  const assumptions = [
    'The guide states no affix rolls, glyph levels, or masterwork values. Where the item is the same, Nikolay\'s stored rolls are used. Assumption.',
    `Glyph levels stay Nikolay's stored levels: ${paragon.levels.map(item => `${item.glyphId} ${item.level}`).join(', ')}. The guide states no glyph level. Assumption.`,
    'Paragon nodes inside each board stay Nikolay\'s stored nodes. The recorded guide lists the board and the glyph only. Assumption.',
    'Both rows use Nikolay\'s combat-allbuff sheet, weapon damage, strength, and the 60s buff timeline. The guide states none of those numbers. Assumption.',
    'Both rows use the calibrated 4.1%[x] per soul on the sum model. That rate is Nikolay\'s Leoric gem chain. The guide helm is Tuskhelm and states no soul rate. Keeping 4.1 on the guide row is an assumption so both rows share the calibrated model.',
    'Changed slots do not receive the replaced item\'s affixes. No roll is invented for Ring of Starless Skies, Blood-Mad Idol, or The Furnace.',
    'Tuskhelm\'s stored charm lines have no damage bucket. Placing that name on the helm adds no multiplier.',
    'The guide names Spirit as a 1H mace. Nikolay\'s stored Spirit is a 1H sword. No separate mace damage number is stored.'
  ];
  return {
    source: guide.source || GUIDE_SOURCE,
    guideId: guide.id,
    guideName: guide.name,
    recordedOn: guide.recordedOn,
    author: guide.author,
    updated: guide.updated,
    defaults,
    context: 'combat-allbuff',
    timeline: 'the stored 60s buff timeline',
    nikolay: { id: nikolay.id, name: nikolay.name, rows: nikolayRows },
    guideScores: { id: guide.id, name: guide.name, rows: guideRows },
    fullMultiplier: { peak: fullPeak, average: fullAverage },
    slots,
    missing: [...missingGear, ...missingCharms],
    beats: [...hisGear, ...hisCharms].filter(item => item.beats),
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

export function renderGuideComparison(report) {
  const n15 = report.nikolay.rows.find(row => row.souls === 15);
  const n30 = report.nikolay.rows.find(row => row.souls === 30);
  const g15 = report.guideScores.rows.find(row => row.souls === 15);
  const g30 = report.guideScores.rows.find(row => row.souls === 30);
  const lines = [
    '# Whirlwind guide variant 4 vs Nikolay\'s build',
    '',
    `The guide is the recorded row \`${report.guideId}\` in \`data/meta-builds.json\`. Source: ${report.source}. Author ${report.author}, updated ${report.updated}, recorded ${report.recordedOn}. That row is names and the link. This comparison uses those recorded names.`,
    '',
    'The score is the calibrated model. Souls use the sum `1 + 0.041 × souls`. `overpowerSheetMeaning` is `total`. `critAudit.reading` is `headline`. Those defaults are calibrated against the 718B boss-dummy hit at 30 souls (peak 784B with the Burning line, 653B without it; average 341B). Both builds use the combat-allbuff sheet and the same 60s buff timeline. The peak is the full overlap on the high end of the All Damage ramp. The sustained average weights that timeline. The guide states no sheet, so both rows use Nikolay\'s sheet.',
    '',
    '## Scores',
    '',
    '| Build | Souls | Peak | Sustained average |',
    '| --- | ---: | ---: | ---: |',
    `| Nikolay | 15 | ${billionsText(n15.peakTotal)} | ${billionsText(n15.averageTotal)} |`,
    `| Nikolay | 30 | ${billionsText(n30.peakTotal)} | ${billionsText(n30.averageTotal)} |`,
    `| Guide variant 4 | 15 | ${billionsText(g15.peakTotal)} | ${billionsText(g15.averageTotal)} |`,
    `| Guide variant 4 | 30 | ${billionsText(g30.peakTotal)} | ${billionsText(g30.averageTotal)} |`,
    '',
    `Replacing Nikolay's differing items with the guide's items multiplies the 30-soul peak by ${factorText(report.fullMultiplier.peak)} and the sustained average by ${factorText(report.fullMultiplier.average)}.`,
    '',
    '## Per-slot diff',
    '',
    'The multiplier is the 30-soul score after that one slot takes the guide item, divided by Nikolay\'s score. A factor below 1 means his item scores higher. The same factor applies at 15 souls, because the changed line is a multiplier and the soul factor scales both rows together. Peak and average use the same factor when the line is on for the whole timeline.',
    '',
    '| Slot | Nikolay | Guide | Multiplier |',
    '| --- | --- | --- | ---: |'
  ];
  for (const slot of report.slots) {
    const guideLabel = slot.guideSlotLabel && slot.guideSlotLabel !== slot.label ? `${slot.guideName} (${slot.guideSlotLabel})` : slot.guideName;
    lines.push(`| ${slot.label} | ${slot.nikolayName} | ${guideLabel} | ${factorText(slot.swapMultiplierPeak)} |`);
  }
  lines.push('', 'Crushing Aspect is on both builds. The guide lists it on ring 1 and Ring of Starless Skies on ring 2. Nikolay lists Stone of Jordan on ring 1 and Crushing Aspect on ring 2. The scored swap keeps Crushing Aspect and replaces Stone of Jordan.');
  lines.push('', 'Notes on the slots that need one:');
  lines.push('');
  for (const slot of report.slots.filter(slot => slot.note)) {
    lines.push(`- ${slot.label}: ${slot.note}`);
  }
  lines.push('', '## Guide items he is missing', '');
  for (const item of report.missing) lines.push(`- ${item.name} (${item.where})`);
  lines.push('', '## His items that beat the guide', '');
  if (!report.beats.length) lines.push('No scored item of his beats the guide item in that slot.');
  for (const item of report.beats) {
    lines.push(`- ${item.name} (${item.where}) scores higher. Swapping it for the guide item multiplies the score by ${factorText(item.multiplier)}.`);
  }
  const ties = report.hisChoices.filter(item => !item.beats);
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
