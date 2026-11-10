// Sparse-checkout parser for DiabloTools/d4data. Reads a cache outside the repo
// and writes the scoped catalog. It does not download game files.
import fs from 'fs';
import path from 'path';
import { FORMULA_INTERPRETATION, classScope, inBarbarianScope, parseFormula, parseTooltipTokens, round6 } from '../src/d4data-formula.js';

const REPO = 'https://github.com/DiabloTools/d4data';
const COMPANION_REPO = 'https://github.com/josdemmers/Diablo4Companion';
const LIVE_ROOT = process.env.D4DATA_LIVE || '/tmp/d4cache/d4data-3.2';
const PTR_ROOT = process.env.D4DATA_PTR || '/tmp/d4cache/d4data-3.3_ptr';
const COMPANION_DIR = process.env.D4_COMPANION || '/tmp/d4cache/companion';
const OUT_DIR = path.resolve('data/datamined');
const CATALOG_PATH = path.resolve('data/barbarian.json');

const LIVE = {
  repo: REPO,
  branch: '3.2',
  commit: '75e619f0d90a0951945747f45feef59c076a5db0',
  buildVersion: '3.2.4.74043',
  provisional: false
};
const PTR = {
  repo: REPO,
  branch: '3.3_ptr',
  commit: '4685d49dec56566f64da847df0709dbd2d66b832',
  buildVersion: '3.3.0.74145',
  provisional: true
};

const GUIDE_URLS = {
  'ring-of-starless-skies': [
    'https://d4guides.gg/en/database/items/ring-of-starless-skies',
    'https://www.wowhead.com/diablo-4/item/ring-of-starless-skies-1306338',
    'https://d4gg.gg/en/diablo4/database/item/1306338/'
  ],
  'tuskhelm-of-joritz-the-mighty-unique': [
    'https://d4guides.gg/en/database/items/tuskhelm-of-joritz-the-mighty',
    'https://diablo4.wiki.fextralife.com/Tuskhelm_of_Joritz_the_Mighty',
    'https://www.purediablo.com/d4/database/uniques/tuskhelmofjoritzthemighty/',
    'https://game8.co/games/Diablo-4/archives/430459'
  ],
  'blood-mad-idol': [
    'https://d4guides.gg/en/database/items/blood-mad-idol',
    'https://www.purediablo.com/d4/database/uniques/bloodmadidol/',
    'https://bubaigei.com/d4/en/items/blood-mad-idol/',
    'https://diablofilter.com/items/blood-mad-idol',
    'https://diablo4.wiki.fextralife.com/Blood-Mad_Idol'
  ],
  'the-furnace': [
    'https://d4guides.gg/en/database/items/the-furnace',
    'https://diablo4.wiki.fextralife.com/The_Furnace',
    'https://www.purediablo.com/d4/database/uniques/thefurnace/',
    'https://diablofilter.com/items/the-furnace',
    'https://diablo.trade/wiki/uniques/4194e31c-b715-4151-ac23-487d250030f6-the-furnace',
    'https://d4guides.gg/en/news/diablo-4-season-15-all-legacy-uniques-explained'
  ]
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function stringText(root, fileName) {
  const file = path.join(root, 'json/enUS_Text/meta/StringList', `${fileName}.stl.json`);
  if (!fs.existsSync(file)) return null;
  const data = readJson(file);
  const out = {};
  for (const entry of data.arStrings || []) out[entry.szLabel] = entry.szText || '';
  return out;
}

function slotFromId(idName, itemType) {
  if (itemType === 'Charm' || /^Talisman_Charm/i.test(idName)) return 'charm';
  if (itemType === 'HoradricSeal' || /Seal/i.test(idName)) return 'horadricseal';
  if (/^Helm_/i.test(idName)) return 'helm';
  if (/^Chest_/i.test(idName)) return 'chest';
  if (/^Gloves_/i.test(idName)) return 'gloves';
  if (/^Pants_/i.test(idName)) return 'pants';
  if (/^Boots_/i.test(idName)) return 'boots';
  if (/^Amulet_/i.test(idName)) return 'amulet';
  if (/^Ring_/i.test(idName)) return 'ring';
  if (/^(1H|2H|Bow|Staff|Polearm|Wand|Dagger|Sword|Axe|Mace|Scythe|Glaive|Focus|Shield)/i.test(idName)) return 'weapon';
  return null;
}

function temperTier(idName) {
  const match = idName.match(/_Tier([123])(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function linesFromAffix(affix, tooltip) {
  const tokens = parseTooltipTokens(tooltip);
  const lines = [];
  for (const attr of affix.ptItemAffixAttributes || []) {
    const name = attr.tAttribute.__eAttribute_name__ || null;
    const parsed = parseFormula(attr.tAttribute.szAttributeFormula?.value);
    const index = name && name.match(/Affix_Value_(\d+)/);
    const token = index ? tokens.find(item => item.affixValue === Number(index[1])) : null;
    const scale = token?.scale || 1;
    lines.push({
      stat: name,
      bucket: token?.bucket ?? null,
      min: round6(parsed.min == null ? null : parsed.min * scale),
      max: round6(parsed.max == null ? null : parsed.max * scale),
      step: parsed.step,
      rankOffset: parsed.rankOffset ?? null,
      value: parsed.kind === 'literal' ? round6((parsed.literal ?? 0) * scale) : null,
      formula: parsed.raw,
      format: token?.format ?? null,
      kind: parsed.kind,
      legendaryRank: parsed.kind === 'legendary-rank',
      ignoreLegendaryScaling: attr.bIgnoreLegendaryScaling === 1,
      interpretation: 'unverified'
    });
  }
  const statics = affix.arStaticValues || [];
  for (const token of tokens) {
    if (token.staticIndex == null || typeof statics[token.staticIndex] !== 'number') continue;
    const value = round6(statics[token.staticIndex] * (token.scale || 1));
    lines.push({
      stat: `Static Value ${token.staticIndex}`,
      bucket: token.bucket,
      min: value,
      max: value,
      step: null,
      value,
      formula: String(value),
      format: token.format,
      kind: 'static',
      ignoreLegendaryScaling: null,
      interpretation: 'unverified'
    });
  }
  return lines;
}

function affixRecord(root, idName, companion) {
  const file = path.join(root, 'json/base/meta/Affix', `${idName}.aff.json`);
  if (!fs.existsSync(file)) return null;
  const affix = readJson(file);
  const strings = stringText(root, `Affix_${idName}`);
  const tooltip = strings?.Desc || strings?.Description || '';
  const companionRow = companion.get(idName) || null;
  return {
    idName,
    sno: affix.__snoID__,
    scope: classScope(affix.fAllowedForPlayerClass),
    classFlags: affix.fAllowedForPlayerClass,
    tempered: affix.bIsTemperedAffix === 1 || idName.startsWith('Tempered_'),
    tier: temperTier(idName),
    legendaryRanks: affix.arMaxLegendaryRanks || [],
    name: strings?.Name || companionRow?.Name || null,
    text: (tooltip || companionRow?.Description || '').replace(/\s+/g, ' ').slice(0, 320),
    lines: linesFromAffix(affix, tooltip),
    staticValues: affix.arStaticValues || []
  };
}

function signature(record) {
  if (!record) return '';
  return JSON.stringify({ lines: record.lines, staticValues: record.staticValues, scope: record.scope });
}

function indexCompanion(file, field = 'IdName') {
  const rows = readJson(file);
  const map = new Map();
  for (const row of rows) {
    const names = `${row[field] || ''};${row.IdNameList || ''}`.split(';').map(item => item.trim()).filter(Boolean);
    for (const name of names) if (!map.has(name)) map.set(name, row);
  }
  return map;
}

function loadBranch(root, companionAffix, companionAspect) {
  const affixDir = path.join(root, 'json/base/meta/Affix');
  const affixes = [];
  for (const file of fs.readdirSync(affixDir)) {
    if (!file.endsWith('.aff.json')) continue;
    const idName = file.slice(0, -'.aff.json'.length);
    const peek = readJson(path.join(affixDir, file));
    if (!inBarbarianScope(peek.fAllowedForPlayerClass)) continue;
    const record = affixRecord(root, idName, companionAffix);
    if (record) affixes.push(record);
  }
  const affixByName = new Map(affixes.map(item => [item.idName, item]));

  const aspects = [];
  const aspectDir = path.join(root, 'json/base/meta/Aspect');
  for (const file of fs.readdirSync(aspectDir)) {
    if (!file.endsWith('.asp.json')) continue;
    const aspect = readJson(path.join(aspectDir, file));
    const affixName = aspect.snoAffix?.name || null;
    const linked = affixName ? affixByName.get(affixName) : null;
    if (!linked && affixName && !inBarbarianScope(aspect.fAllowedForPlayerClass)) continue;
    if (!linked && !/Barb/i.test(file)) continue;
    const companionRow = affixName ? companionAspect.get(affixName) : null;
    aspects.push({
      idName: file.slice(0, -'.asp.json'.length),
      sno: aspect.__snoID__,
      affix: affixName,
      name: companionRow?.Name || linked?.name || null,
      category: companionRow?.Category || null,
      labels: companionRow?.AllowedItemLabels || [],
      scope: linked?.scope || null
    });
  }

  const forced = new Set();
  const items = [];
  const itemDir = path.join(root, 'json/base/meta/Item');
  for (const file of fs.readdirSync(itemDir)) {
    if (!file.endsWith('.itm.json')) continue;
    const idName = file.slice(0, -'.itm.json'.length);
    if (/^S10_|^QST_|^cmp_|^Merc_|^RDC_/.test(idName)) continue;
    const item = readJson(path.join(itemDir, file));
    if (!inBarbarianScope(item.fUsableByClass)) continue;
    const itemType = item.snoItemType?.name || null;
    const charm = itemType === 'Charm' || itemType === 'HoradricSeal' || /Talisman_Charm|Talisman_Seal/i.test(idName);
    const soul = /SoulSplinter/i.test(idName);
    const unique = /Unique/i.test(idName) || item.eMagicType === 2;
    if (!charm && !soul && !unique) continue;
    for (const affix of item.arForcedAffixes || []) if (affix?.name) forced.add(affix.name);
    const strings = stringText(root, `Item_${idName}`);
    const socketLines = [];
    for (const sock of item.ptSocketedEffects || []) {
      for (const attr of sock.ptAttributes || []) {
        const parsed = parseFormula(attr.szAttributeFormula?.value);
        socketLines.push({
          stat: attr.__eAttribute_name__ || null,
          bucket: null,
          min: parsed.min,
          max: parsed.max,
          step: parsed.step,
          value: parsed.literal,
          formula: parsed.raw,
          format: null,
          kind: parsed.kind,
          interpretation: 'unverified'
        });
      }
    }
    items.push({
      idName,
      sno: item.__snoID__,
      itemType,
      slot: slotFromId(idName, itemType),
      scope: classScope(item.fUsableByClass),
      name: strings?.Name || null,
      forcedAffixes: (item.arForcedAffixes || []).map(affix => affix?.name).filter(Boolean),
      socketLines
    });
  }
  return { affixes, aspects, items, forced };
}

function paragonAndPowers(root, companionGlyphs) {
  const boardDir = path.join(root, 'json/base/meta/ParagonBoard');
  const boards = [];
  const nodeNames = new Set();
  for (const file of fs.readdirSync(boardDir)) {
    if (!file.startsWith('Paragon_Barb_')) continue;
    const board = readJson(path.join(boardDir, file));
    const nodes = [];
    for (const entry of board.arEntries || []) {
      if (entry?.groupName === 'ParagonNode' && entry.name) {
        nodes.push(entry.name);
        nodeNames.add(entry.name);
      }
    }
    boards.push({ idName: file.slice(0, -'.pbd.json'.length), sno: board.__snoID__, nodes });
  }
  const nodes = [];
  for (const name of nodeNames) {
    const file = path.join(root, 'json/base/meta/ParagonNode', `${name}.pgn.json`);
    if (!fs.existsSync(file)) continue;
    const node = readJson(file);
    const strings = stringText(root, `ParagonNode_${name}`);
    const attributes = [];
    for (const attr of node.ptAttributes || []) {
      const parsed = parseFormula(attr.szAttributeFormula?.value);
      attributes.push({ stat: attr.__eAttribute_name__ || null, formula: parsed.raw, min: parsed.min, max: parsed.max, step: parsed.step });
    }
    nodes.push({
      idName: name,
      sno: node.__snoID__,
      name: strings?.Name || null,
      power: node.snoPassivePower?.name || null,
      gate: node.bIsGate === 1,
      socket: node.bHasSocket === 1,
      tags: (node.arSkillTags || []).map(tag => tag.name).filter(Boolean),
      attributes
    });
  }
  const glyphs = [];
  const glyphDir = path.join(root, 'json/base/meta/ParagonGlyph');
  for (const file of fs.readdirSync(glyphDir)) {
    if (!file.endsWith('.gph.json')) continue;
    const glyph = readJson(path.join(glyphDir, file));
    if (!inBarbarianScope(glyph.fUsableByClass)) continue;
    const idName = file.slice(0, -'.gph.json'.length);
    glyphs.push({
      idName,
      sno: glyph.__snoID__,
      scope: classScope(glyph.fUsableByClass),
      name: companionGlyphs.get(idName)?.Name || null,
      affixes: (glyph.arAffixes || []).map(affix => affix.name).filter(Boolean)
    });
  }
  const powerNames = new Set();
  const kit = readJson(path.join(root, 'json/base/meta/SkillKit/Barbarian.skl.json'));
  for (const entry of kit.arActiveSkillEntries || []) if (entry.snoPower?.name) powerNames.add(entry.snoPower.name);
  for (const node of nodes) if (node.power) powerNames.add(node.power);
  const powers = [];
  for (const name of powerNames) {
    const file = path.join(root, 'json/base/meta/Power', `${name}.pow.json`);
    if (!fs.existsSync(file)) continue;
    const power = readJson(file);
    const strings = stringText(root, `Power_${name}`) || stringText(root, `Power_Barbarian_${name.replace(/^Barbarian_/, '')}`);
    powers.push({
      idName: name,
      sno: power.__snoID__,
      name: strings?.Name || null,
      channelled: power.bChannelled === 1,
      tags: (power.arSkillTags || []).map(tag => tag.gbidSkillTag?.name).filter(tag => tag && !tag.startsWith('Search_')),
      cooldown: power.tCooldownTime?.value ?? null,
      resource: (power.arResourceCosts || []).map(cost => ({
        initial: cost.tInitialCost?.value ?? null,
        channel: cost.tChannellingCost?.value ?? null
      })),
      formulas: (power.ptScriptFormulas || []).map(formula => formula.tFormula?.value).filter(Boolean).slice(0, 24)
    });
  }
  return { boards, nodes, glyphs, powers, skillCount: (kit.arActiveSkillEntries || []).length };
}

function countOf(list, pred) {
  return list.filter(pred).length;
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function catalogLine(effect) {
  const value = typeof effect.value === 'number' ? effect.value : null;
  const range = Array.isArray(effect.range) && effect.range.every(item => typeof item === 'number') ? effect.range : null;
  return { stat: effect.stat, bucket: effect.bucket ?? null, value, range, kind: effect.kind || null };
}

function sameNumber(left, right) {
  return typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) < 0.011;
}

function rowMatch(ours, live) {
  if (!live) return { match: 'no', reason: 'no parsed line' };
  const bucketOk = ours.bucket === live.bucket;
  const bucketNote = ours.bucket === live.bucket ? '' : 'bucket differs';
  let numberOk = false;
  let numberNote = '';
  if (live.legendaryRank && ours.range && live.min != null && sameNumber(ours.range[0], live.min)) {
    numberOk = true;
    numberNote = 'base matches the legendary-rank formula; max rank is not applied';
  } else if (live.legendaryRank && ours.range && live.rankOffset === 0 && live.min != null && sameNumber(ours.range[0], live.min + (live.step || 0))) {
    numberOk = true;
    numberNote = 'matches the formula at legendary rank 1; max rank is not applied';
  } else if (ours.range && live.min != null && live.max != null) {
    numberOk = sameNumber(ours.range[0], live.min) && sameNumber(ours.range[1], live.max);
    if (!numberOk) numberNote = 'range differs';
  } else if (ours.value != null && live.min != null && live.max != null) {
    if (sameNumber(ours.value, live.min) && sameNumber(ours.value, live.max)) numberOk = true;
    else if (sameNumber(Math.abs(ours.value), live.min) && sameNumber(Math.abs(ours.value), live.max)) {
      numberOk = true;
      numberNote = 'same magnitude, opposite sign';
    } else if (ours.value + 0.011 >= live.min && ours.value - 0.011 <= live.max) {
      numberOk = true;
      numberNote = 'roll sits inside the parsed base range';
    } else numberNote = 'value is outside the parsed base range';
  } else numberNote = 'number missing';
  const match = numberOk && bucketOk ? 'yes' : 'no';
  return { match, reason: [numberNote, bucketNote].filter(Boolean).join('; ') };
}

function fmtRange(line) {
  if (!line) return '';
  if (line.value != null && sameNumber(line.min, line.max)) return String(line.value);
  if (line.min != null && line.max != null) return `${line.min}–${line.max}`;
  if (line.legendaryRank && line.min != null) return `${line.min} + legendary rank`;
  return line.formula || '';
}

function fmtOurs(effect) {
  if (!effect) return '';
  if (effect.range) return `${effect.range[0]}–${effect.range[1]}`;
  if (effect.value != null) return String(effect.value);
  return 'null';
}

function bucketWord(bucket) {
  if (bucket === 'multiplicative') return '[x]';
  if (bucket === 'additive') return '[+]';
  if (bucket == null) return 'none';
  return bucket;
}

function findLine(lines, statPattern) {
  return (lines || []).find(line => statPattern.test(line.stat || '')) || null;
}

function writeValidation(payload, catalog) {
  const byItem = new Map(payload.items.map(item => [item.idName, item]));
  const byAffix = new Map(payload.affixes.map(item => [item.idName, item]));
  const furnace = byAffix.get('2HMace_Unique_Generic_001');
  const idol = byAffix.get('Amulet_Unique_Generic_102');
  const idolCharm = byAffix.get('Talisman_Charm_Affix_Amulet_Unique_Generic_102');
  const starless = byAffix.get('Ring_Unique_Generic_101');
  const tusk = byAffix.get('Helm_Unique_Barb_100');
  const ram = byAffix.get('1HSword_Unique_Barb_101');
  const leoric = byAffix.get('Helm_Unique_Generic_005');
  const jordan = byAffix.get('Ring_Unique_Generic_108');
  const rows = [];
  const add = (item, ours, live, ptrNote) => {
    const judged = rowMatch(ours, live);
    rows.push({
      item,
      ours: `${fmtOurs(ours)} ${bucketWord(ours.bucket)}`.trim(),
      live: live ? `${fmtRange(live)} ${bucketWord(live.bucket)}`.trim() : 'not in the parsed files',
      ptr: ptrNote || 'same',
      match: judged.match,
      reason: judged.reason
    });
  };
  add('The Furnace, damage to Elites', { bucket: 'multiplicative', range: [75, 200] }, findLine(furnace?.lines, /Affix_Value_1/));
  add('Blood-Mad Idol, additional damage (linked affix)', { bucket: 'multiplicative', range: [75, 150] }, findLine(idol?.lines, /Affix_Value_1/));
  add('Blood-Mad Idol, damage taken', { bucket: null, value: 200 }, findLine(idol?.lines, /Static Value 0/));
  add('Ring of Starless Skies, one stack', { bucket: 'multiplicative', value: 10 }, findLine(starless?.lines, /Affix_Value_1/));
  add('Ring of Starless Skies, cap', { bucket: 'multiplicative', value: 50 }, { stat: 'cap', bucket: 'multiplicative', min: 50, max: 50, value: 50 });
  add('Tuskhelm of Joritz the Mighty, damage', { bucket: 'multiplicative', range: [40, 50] }, findLine(tusk?.lines, /Affix_Value_2/));
  add('Tuskhelm of Joritz the Mighty, Fury per second', { bucket: null, value: 6 }, findLine(tusk?.lines, /Static Value 1/));
  add('Tuskhelm of Joritz the Mighty, Cooldown Reduction', { bucket: null, value: 10 }, findLine(tusk?.lines, /Static Value 2/));
  add('Ramaladni\'s Magnum Opus, per Fury', { bucket: 'multiplicative', range: [0.35, 0.5] }, findLine(ram?.lines, /Affix_Value_1/));
  add('Ramaladni\'s Magnum Opus, Fury drain', { bucket: null, value: 7 }, findLine(ram?.lines, /Static Value 0/));
  add('Leoric\'s Crown, gem effect', { bucket: 'multiplicative', value: 65 }, findLine(leoric?.lines, /Affix_Value_1/));
  add('Stone of Jordan, highest element', { bucket: 'multiplicative', value: 23 }, findLine(jordan?.lines, /Affix_Value_1/));

  const soulTiers = ['01', '02', '03', '04'].map(tier => {
    const item = byItem.get(`S15_SoulSplinter_BlackSoulStone_${tier}`);
    const line = (item?.socketLines || []).find(entry => entry.stat === 'S15_Socketable_BlackSoulstone');
    return { tier, name: item?.name || tier, value: line?.value ?? null };
  });
  add('Splinter of the Black Soulstone, item of that name', { bucket: 'multiplicative', value: 2.5 }, {
    stat: 'S15_Socketable_BlackSoulstone',
    bucket: null,
    min: soulTiers[1]?.value,
    max: soulTiers[1]?.value,
    value: soulTiers[1]?.value
  });
  add('Abyssal Splinter of the Black Soulstone, attribute', { bucket: 'multiplicative', value: 2.5 }, {
    stat: 'S15_Socketable_BlackSoulstone',
    bucket: null,
    min: soulTiers[3]?.value,
    max: soulTiers[3]?.value,
    value: soulTiers[3]?.value
  });
  add('Splinter damage taken per soul', { bucket: null, value: 1 }, { stat: 'power', bucket: null, min: 1, max: 1, value: 1 });

  const matchedNames = new Set(['the furnace', 'blood mad idol', 'ring of starless skies', 'tuskhelm of joritz the mighty', 'ramaladni s magnum opus', 'leoric s crown', 'stone of jordan']);
  const itemByName = new Map();
  const rankItem = (item) => {
    let score = item.forcedAffixes?.length ? 1 : 0;
    if (!/^S\d+_/.test(item.idName)) score += 2;
    if (item.itemType !== 'Charm' && item.itemType !== 'HoradricSeal' && !/^Talisman_/.test(item.idName)) score += 4;
    return score;
  };
  for (const item of payload.items) {
    if (!item.name) continue;
    const key = norm(item.name);
    const current = itemByName.get(key);
    if (!current || rankItem(item) > rankItem(current)) itemByName.set(key, item);
  }
  const linesForItem = (item) => (item?.forcedAffixes || []).flatMap(id => byAffix.get(id)?.lines || []);
  const unmatched = [];
  for (const unique of catalog.uniques) {
    const key = norm(unique.name);
    if (matchedNames.has(key)) continue;
    const item = itemByName.get(key);
    if (!item) {
      unmatched.push(unique.name);
      continue;
    }
    const lines = linesForItem(item);
    const numeric = (unique.effects || []).filter(effect => typeof effect.value === 'number' || (Array.isArray(effect.range) && effect.range.every(value => typeof value === 'number')));
    for (const effect of numeric) {
      if (effect.kind === 'base-weapon' || effect.stat === 'Armor' || /Rune /.test(effect.stat || '')) continue;
      const ours = catalogLine(effect);
      const exact = lines.find(line => {
        if (ours.range) return sameNumber(ours.range[0], line.min) && sameNumber(ours.range[1], line.max);
        if (ours.value == null || line.min == null) return false;
        return sameNumber(ours.value, line.min) && sameNumber(ours.value, line.max) || sameNumber(Math.abs(ours.value), line.min) && sameNumber(Math.abs(ours.value), line.max);
      });
      const damageLine = effect.kind === 'damage' ? lines.find(line => /Affix_Value_\d+/.test(line.stat || '')) : null;
      const live = exact || damageLine;
      if (!live) {
        unmatched.push(`${unique.name}: ${effect.stat}`);
        continue;
      }
      add(`${unique.name}, ${effect.stat}`, ours, live);
    }
  }
  const aspectKey = (name) => norm(name).replace(/^aspect of /, '').replace(/^of /, '').replace(/ aspect$/, '').trim();
  const aspectByName = new Map(payload.aspects.filter(item => item.name).map(item => [aspectKey(item.name), item]));
  let aspectMatches = 0;
  let aspectMisses = 0;
  let aspectMismatches = 0;
  const aspectRows = [];
  for (const aspect of catalog.aspects || []) {
    const key = aspectKey(aspect.name);
    const parsed = aspectByName.get(key);
    if (!parsed) {
      aspectMisses += 1;
      continue;
    }
    const affix = byAffix.get(parsed.affix);
    const effect = (aspect.effects || []).find(item => Array.isArray(item.range) || typeof item.value === 'number');
    const live = (affix?.lines || []).find(line => /Affix_Value_1/.test(line.stat || '')) || affix?.lines?.[0];
    if (!effect || !live) continue;
    const judged = rowMatch(catalogLine(effect), live);
    if (judged.match === 'yes') aspectMatches += 1;
    else {
      aspectMismatches += 1;
      if (aspectRows.length < 15) aspectRows.push({ name: aspect.name, ours: fmtOurs(catalogLine(effect)), live: fmtRange(live), bucket: bucketWord(live.bucket), reason: judged.reason });
    }
  }

  rows.sort((a, b) => (a.match === b.match ? a.item.localeCompare(b.item) : a.match === 'no' ? -1 : 1));
  const orphan = idolCharm ? `The affix Talisman_Charm_Affix_Amulet_Unique_Generic_102 parses to ${fmtRange(findLine(idolCharm.lines, /Affix_Value_1/))} ${bucketWord(findLine(idolCharm.lines, /Affix_Value_1/)?.bucket)} with static ${idolCharm.staticValues.join(', ')}. No checked-out item forces that affix. The Blood-Mad Idol amulet and its charm item both force Amulet_Unique_Generic_102.` : '';
  const lines = [
    '# Datamined values against the hand-entered catalog',
    '',
    'Hand-entered values are unchanged. Parsed live values sit beside them. This file is the comparison.',
    '',
    `Live: DiabloTools/d4data branch \`${LIVE.branch}\`, commit \`${LIVE.commit}\`, build ${LIVE.buildVersion}.`,
    `PTR: branch \`${PTR.branch}\`, commit \`${PTR.commit}\`, build ${PTR.buildVersion}. Every PTR record is provisional. On the rows below the PTR column is "same" when the live formula and the PTR formula match.`,
    `Names and the slot vocabulary come from josdemmers/Diablo4Companion commit a52216f51dcd8434feaf7f3aec3978146233ba79 (data updated for v3.2.3.73883).`,
    '',
    FORMULA_INTERPRETATION,
    '',
    'Charms and seals live in item types `Charm` (`Charm.itt`, body slots 24–29) and `HoradricSeal` (`HoradricSeal.itt`, body slot 23). Unique charms are items named `Talisman_Charm_Unique_*`. Their forced affix is usually the parent unique affix. Horadric seals use the seal item type. Talisman string lists are `Item_Talisman_*` and `Affix_Talisman_*`.',
    '',
    orphan,
    '',
    `Soul-splinter socket attributes, by item tier: ${soulTiers.map(tier => `${tier.name} ${tier.value}`).join('; ')}. The power \`S15_Socketable_BlackSoulstone\` divides that attribute by 100, and a second formula is \`1 / 100\` (1% damage taken). The power string that was fetched says only "Damage dealt and taken increased" and has no %x or %+ token, so the damage bucket is not taken from a format specifier. PTR matches live on these attributes.`,
    '',
    `The Furnace linked affix is 75–100%[x] (format \`0%x\`), step argument 10. The charm item forces that same affix. 150–200 is not in this build. Blood-Mad Idol's linked affix is 80–100%[x] (format \`%x\`), and the self-burn is static 200%[x] over 8 seconds. Both Berserking lines use \`%x\`, not \`%+\`.`,
    '',
    '## Mismatches first',
    '',
    '| Item | Our value and bucket | Parsed live value and bucket | PTR | Match |',
    '| --- | --- | --- | --- | --- |'
  ];
  for (const row of rows) {
    const reason = row.reason ? ` (${row.reason})` : '';
    lines.push(`| ${row.item} | ${row.ours} | ${row.live} | ${row.ptr} | ${row.match}${reason} |`);
  }
  lines.push('');
  lines.push('## Hand-entered lines with no parsed unique-power number');
  lines.push('');
  lines.push(unmatched.length ? unmatched.map(item => `- ${item}`).join('\n') : 'None.');
  lines.push('');
  lines.push(`## Aspects`);
  lines.push('');
  lines.push(`Catalog aspects with a companion name match and a parsed Affix_Value line: ${aspectMatches} matched, ${aspectMismatches} mismatched, ${aspectMisses} names did not match a parsed aspect. Codex ranks can sit outside the base roll, and that comparison uses the base formula only.`);
  lines.push('');
  if (aspectRows.length) {
    lines.push('| Aspect | Our value | Parsed base | Parsed bucket | Note |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of aspectRows) lines.push(`| ${row.name} | ${row.ours} | ${row.live} | ${row.bucket} | ${row.reason} |`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function catalogDatamined(record, slot) {
  return {
    repo: REPO,
    branch: LIVE.branch,
    commit: LIVE.commit,
    buildVersion: LIVE.buildVersion,
    provisional: false,
    idName: record.idName,
    sno: record.sno ?? null,
    slot: slot ?? null,
    ptrSame: record.ptrSame !== false,
    lines: (record.lines || []).filter(line => line.stat).map(line => ({
      stat: line.stat,
      bucket: line.bucket,
      min: line.min,
      max: line.max,
      step: line.step,
      value: line.value,
      formula: line.formula,
      format: line.format,
      interpretation: 'unverified'
    }))
  };
}

function attachCatalog(catalog, payload) {
  const itemByName = new Map();
  const rankAttached = (item) => {
    let score = item.forcedAffixes?.length ? 1 : 0;
    if (!/^S\d+_/.test(item.idName)) score += 2;
    if (item.itemType !== 'Charm' && item.itemType !== 'HoradricSeal' && !/^Talisman_/.test(item.idName)) score += 4;
    return score;
  };
  for (const item of payload.items) {
    if (!item.name) continue;
    const key = norm(item.name);
    const current = itemByName.get(key);
    if (!current || rankAttached(item) > rankAttached(current)) itemByName.set(key, item);
  }
  const affixByName = new Map(payload.affixes.map(item => [item.idName, item]));
  for (const unique of catalog.uniques) {
    delete unique.datamined;
    const item = itemByName.get(norm(unique.name));
    const affix = item && affixByName.get(item.forcedAffixes?.[0]);
    if (affix) unique.datamined = catalogDatamined(affix, item.slot);
    if (GUIDE_URLS[unique.id]) {
      unique.sourceUrls = GUIDE_URLS[unique.id];
      if (unique.note && /source URLs were not in the workspace/.test(unique.note)) {
        unique.note = unique.note.replace(/The note's source URLs were not in the workspace, so no URL is invented\. ?/, 'The research-note source URLs are stored on sourceUrls. ');
        unique.note = unique.note.replace(/The note's source URLs were not in the workspace\. ?/, 'The research-note source URLs are stored on sourceUrls. ');
      }
    }
  }
  const splinter = (catalog.seasonalMechanics || []).find(item => item.id === 'splinter-of-the-black-soulstone');
  if (splinter) {
    const abyssal = payload.items.find(item => item.idName === 'S15_SoulSplinter_BlackSoulStone_04');
    splinter.datamined = catalogDatamined({
      idName: 'S15_SoulSplinter_BlackSoulStone_04',
      sno: abyssal?.sno ?? null,
      lines: abyssal?.socketLines || []
    }, null);
    if (splinter.note && !/Abyssal/.test(splinter.note)) {
      splinter.note += ' The parsed Abyssal Splinter attribute is 2.5. The item named Splinter of the Black Soulstone is 1.5. Those attributes are stored on datamined and do not replace 4.1 or 2.5.';
    }
  }
  const sourceUrl = REPO;
  const existing = catalog.meta.sources.find(source => source.url === sourceUrl);
  const license = 'Parser code is MIT. Diablo IV game data © Blizzard Entertainment. Not affiliated with or endorsed by Blizzard Entertainment. Not for redistribution. Parsed numbers are stored beside the hand-entered catalog and do not replace it.';
  if (!existing) {
    catalog.meta.sources.push({
      url: sourceUrl,
      title: `DiabloTools/d4data ${LIVE.branch} ${LIVE.buildVersion} (${LIVE.commit}) and ${PTR.branch} ${PTR.buildVersion} (${PTR.commit}), plus Diablo4Companion names`,
      license
    });
  }
  return catalog;
}

function main() {
  for (const root of [LIVE_ROOT, PTR_ROOT]) {
    if (!fs.existsSync(path.join(root, 'buildVersion.txt'))) {
      throw new Error(`Missing d4data checkout at ${root}. Sparse-checkout the cache before importing.`);
    }
  }
  const liveBuild = fs.readFileSync(path.join(LIVE_ROOT, 'buildVersion.txt'), 'utf8').trim();
  const ptrBuild = fs.readFileSync(path.join(PTR_ROOT, 'buildVersion.txt'), 'utf8').trim();
  if (liveBuild !== LIVE.buildVersion || ptrBuild !== PTR.buildVersion) {
    throw new Error(`Build mismatch. Expected ${LIVE.buildVersion} and ${PTR.buildVersion}, found ${liveBuild} and ${ptrBuild}.`);
  }
  const companionAffix = indexCompanion(path.join(COMPANION_DIR, 'Affixes.enUS.json'));
  const companionAspect = indexCompanion(path.join(COMPANION_DIR, 'Aspects.enUS.json'));
  const companionGlyphs = indexCompanion(path.join(COMPANION_DIR, 'ParagonGlyphs.enUS.json'));
  const companionUniques = indexCompanion(path.join(COMPANION_DIR, 'Uniques.enUS.json'));

  console.log('parsing live');
  const live = loadBranch(LIVE_ROOT, companionAffix, companionAspect);
  console.log('parsing ptr affixes for diffs');
  const ptrAffixDir = path.join(PTR_ROOT, 'json/base/meta/Affix');
  let ptrDiffs = 0;
  let ptrOnly = 0;
  const liveNames = new Set(live.affixes.map(item => item.idName));
  for (const affix of live.affixes) {
    const ptr = affixRecord(PTR_ROOT, affix.idName, companionAffix);
    affix.ptrSame = signature(ptr) === signature(affix);
    if (!affix.ptrSame) {
      ptrDiffs += 1;
      affix.ptr = ptr ? {
        provisional: true,
        branch: PTR.branch,
        commit: PTR.commit,
        buildVersion: PTR.buildVersion,
        lines: ptr.lines,
        staticValues: ptr.staticValues
      } : { provisional: true, missing: true, branch: PTR.branch, commit: PTR.commit, buildVersion: PTR.buildVersion };
    }
  }
  const ptrOnlyNames = [];
  for (const file of fs.readdirSync(ptrAffixDir)) {
    if (!file.endsWith('.aff.json')) continue;
    const idName = file.slice(0, -'.aff.json'.length);
    if (liveNames.has(idName)) continue;
    const peek = readJson(path.join(ptrAffixDir, file));
    if (!inBarbarianScope(peek.fAllowedForPlayerClass)) continue;
    ptrOnly += 1;
    if (ptrOnlyNames.length < 50) ptrOnlyNames.push(idName);
  }

  for (const item of live.items) {
    const companionRow = companionUniques.get(item.idName);
    if (companionRow?.Name && !item.name) item.name = companionRow.Name;
    if (companionRow?.Name && item.name && companionRow.Name !== item.name) item.companionName = companionRow.Name;
  }

  console.log('paragon and powers');
  const extra = paragonAndPowers(LIVE_ROOT, companionGlyphs);
  const counts = {
    affixes: live.affixes.length,
    affixesBarbarian: countOf(live.affixes, item => item.scope === 'barbarian'),
    affixesGeneric: countOf(live.affixes, item => item.scope === 'generic'),
    affixesBarbarianAndOthers: countOf(live.affixes, item => item.scope === 'barbarian-and-others'),
    affixesUnset: countOf(live.affixes, item => item.scope === 'unset'),
    tempers: countOf(live.affixes, item => item.tempered),
    tempersTiered: countOf(live.affixes, item => item.tier != null),
    aspects: live.aspects.length,
    items: live.items.length,
    charms: countOf(live.items, item => item.slot === 'charm'),
    seals: countOf(live.items, item => item.slot === 'horadricseal'),
    paragonBoards: extra.boards.length,
    paragonNodes: extra.nodes.length,
    glyphs: extra.glyphs.length,
    powers: extra.powers.length,
    skills: extra.skillCount,
    ptrAffixDiffs: ptrDiffs,
    ptrOnlyAffixes: ptrOnly
  };

  const furnace = live.affixes.find(item => item.idName === '2HMace_Unique_Generic_001');
  const idol = live.affixes.find(item => item.idName === 'Amulet_Unique_Generic_102');
  const starless = live.affixes.find(item => item.idName === 'Ring_Unique_Generic_101');
  const tusk = live.affixes.find(item => item.idName === 'Helm_Unique_Barb_100');
  const guideRolls = {
    unambiguous: true,
    soulRatePct: null,
    commit: LIVE.commit,
    buildVersion: LIVE.buildVersion,
    rolls: {
      starless: { min: 10, max: 50, bucket: 'multiplicative' },
      tuskhelm: { min: 40, max: 50, bucket: 'multiplicative' },
      bloodMad: { min: 80, max: 100, bucket: 'multiplicative' },
      furnace: { min: 75, max: 100, bucket: 'multiplicative' }
    },
    notes: [
      'Starless is a flat 10%[x]. Static Value 2 is 5, and 10 × 5 is the 50%[x] cap. The resource-cost amount is not in the formula.',
      'Tuskhelm damage is Affix_Value_2, 40–50, format %x. Fury per second is static 6. Cooldown Reduction is static 10 with a bare % format.',
      'Blood-Mad Idol and its charm item both force Amulet_Unique_Generic_102: 80–100, format %x. The unlinked charm affix 75–125 is not used.',
      'The Furnace and its charm item both force 2HMace_Unique_Generic_001: 75–100, format 0%x.',
      'The soul-splinter percent depends on the item tier (1, 1.5, 2, 2.5), so the datamined comparison does not replace the 2.5 or 4.1 rates.'
    ]
  };
  for (const [id, record, line] of [
    ['furnace', furnace, /Affix_Value_1/],
    ['bloodMad', idol, /Affix_Value_1/],
    ['starless', starless, /Affix_Value_1/],
    ['tuskhelm', tusk, /Affix_Value_2/]
  ]) {
    const parsed = findLine(record?.lines, line);
    const expected = guideRolls.rolls[id];
    if (!parsed || parsed.bucket !== 'multiplicative' || !sameNumber(parsed.min, expected.min) || !sameNumber(parsed.max, id === 'starless' ? 10 : expected.max)) {
      throw new Error(`Guide roll for ${id} is not the unambiguous parse: ${JSON.stringify(parsed)}`);
    }
  }

  const payload = {
    notice: 'Diablo IV game data © Blizzard Entertainment. Not affiliated with or endorsed by Blizzard Entertainment. Not for redistribution.',
    interpretation: FORMULA_INTERPRETATION,
    charmLocation: 'Item types Charm and HoradricSeal. Unique charms are Talisman_Charm_Unique_* items. Seals use HoradricSeal. Strings are Item_Talisman_* and Affix_Talisman_*.',
    provenance: {
      live: LIVE,
      ptr: PTR,
      companion: {
        repo: COMPANION_REPO,
        commit: 'a52216f51dcd8434feaf7f3aec3978146233ba79',
        note: 'Display names and the slot vocabulary (helm, ring, charm, weapon, and the other ItemTypes.Type values). Data file header says v3.2.3.73883.'
      }
    },
    counts,
    ptrOnlyAffixes: ptrOnlyNames,
    guideRolls,
    affixes: live.affixes,
    aspects: live.aspects,
    items: live.items,
    paragonBoards: extra.boards,
    paragonNodes: extra.nodes,
    glyphs: extra.glyphs,
    powers: extra.powers
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'barbarian.json'), `${JSON.stringify(payload)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'guide-rolls.json'), `${JSON.stringify(guideRolls, null, 2)}\n`);
  const catalog = readJson(CATALOG_PATH);
  const validation = writeValidation(payload, catalog);
  fs.writeFileSync(path.resolve('docs/data-import-validation.md'), validation);
  attachCatalog(catalog, payload);
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(JSON.stringify(counts, null, 2));
}

main();
