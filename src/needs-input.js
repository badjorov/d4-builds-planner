const EMPTY_COLLECTIONS = ['skillVariants', 'affixes', 'paragonBoards', 'talismans', 'passives'];

export function needsInput(catalog, root = '') {
  const items = [];
  walk(catalog, root, items);
  if (root === '') {
    for (const key of EMPTY_COLLECTIONS) {
      if (Array.isArray(catalog?.[key]) && catalog[key].length === 0) {
        items.push({ path: `/${key}`, reason: 'empty', message: `/${key} is empty — no entries yet` });
      }
    }
  }
  items.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));
  return items;
}

export function openNeeds(items) {
  return items.filter(item => item.reason !== 'pending-allocation');
}

export function pendingAllocation(items) {
  return items.filter(item => item.reason === 'pending-allocation');
}

export function formatNeedsInput(items) {
  const open = openNeeds(items);
  const pending = pendingAllocation(items);
  const lines = [
    `${open.length} field${open.length === 1 ? '' : 's'} need input`,
    `${pending.length} pending allocation`,
    ''
  ];
  for (const item of open) lines.push(`${item.path} — ${item.reason} — ${item.message}`);
  if (pending.length) {
    lines.push('', 'Pending allocation:');
    for (const item of pending) lines.push(`${item.path} — ${item.reason} — ${item.message}`);
  }
  return lines.join('\n');
}

function walk(value, path, items) {
  if (isInactive(value)) return;
  if (path.endsWith('/value') && Array.isArray(value)) {
    items.push({ path, reason: 'range', message: `${path} is a roll range ${JSON.stringify(value)}; point value not entered` });
    value.forEach((entry, index) => { if (entry === null) walk(null, `${path}/${index}`, items); });
    return;
  }
  if (value === null) {
    items.push({ path, reason: 'null', message: `${path} is null` });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (isInactive(entry)) return;
      const id = entry && typeof entry === 'object' && entry.id ? entry.id : String(index);
      walk(entry, `${path}/${id}`, items);
    });
    return;
  }
  if (value && typeof value === 'object') {
    if (value.verified === false) {
      items.push({ path: `${path}/verified`, reason: 'unverified', message: `${path}/verified is false` });
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'verified') continue;
      if (key === 'allocated') {
        if (entry === null) {
          items.push({
            path: `${path}/allocated`,
            reason: 'pending-allocation',
            message: `${path}/allocated is pending allocation`
          });
        }
        continue;
      }
      walk(entry, `${path}/${key}`, items);
    }
  }
}

function isInactive(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.allocated === false);
}

export function categoryOf(path) {
  return path.split('/').filter(Boolean)[0] || '(root)';
}

export function summarizeNeeds(items) {
  const by = {};
  for (const item of items) {
    const cat = categoryOf(item.path);
    by[cat] ??= { null: 0, unverified: 0, range: 0, empty: 0, 'pending-allocation': 0, total: 0 };
    by[cat][item.reason] = (by[cat][item.reason] || 0) + 1;
    by[cat].total += 1;
  }
  return by;
}

function normName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function plainName(name) {
  return normName(String(name || '').replace(/\s*\(.*$/, ''));
}

const REQUIRED_GEAR_KEYS = new Set(['aspectId', 'uniqueId', 'attacksPerSecond', 'itemCritChance', 'itemName']);
const REQUIRED_STAT_KEYS = new Set([
  'weaponDmg', 'mainStat', 'critChance', 'critDmg', 'vulnPct', 'overpowerPct',
  'maxFury', 'resistanceCapPct', 'verified', 'defense', 'uptime', 'glyphs', 'boards', 'sheet'
]);

export function splitForBuild(items, build, catalog = {}) {
  const skillIds = new Set(build?.skills || []);
  const aspectIds = new Set();
  const uniqueIds = new Set();
  for (const slot of build?.gear || []) {
    if (slot.aspectId) aspectIds.add(slot.aspectId);
    if (slot.uniqueId) uniqueIds.add(slot.uniqueId);
    const name = normName(slot.itemName);
    if (!name) continue;
    for (const aspect of catalog.aspects || []) if (normName(aspect.name) === name) aspectIds.add(aspect.id);
    for (const unique of catalog.uniques || []) if (normName(unique.name) === name) uniqueIds.add(unique.id);
  }
  const glyphIds = new Set((build?.glyphs || []).map(glyph => glyph.glyphId).filter(Boolean));
  const boardNames = new Set((build?.boards || []).map(board => normName(board.name)).filter(Boolean));
  const boardIds = new Set((build?.boards || []).map(board => board.boardId).filter(Boolean));
  for (const board of catalog.paragonBoards || []) {
    if (boardIds.has(board.id) || boardNames.has(normName(board.name)) || boardNames.has(plainName(board.name))) boardIds.add(board.id);
  }
  const nodeIds = new Set();
  for (const node of catalog.paragonNodes || []) {
    if (boardIds.has(node.boardId) || boardNames.has(plainName(node.name)) || boardNames.has(normName(node.name))) nodeIds.add(node.id);
  }

  function isRequired(path) {
    let match = path.match(/^\/skills\/([^/]+)/);
    if (match) return skillIds.has(match[1]);
    match = path.match(/^\/aspects\/([^/]+)/);
    if (match) return aspectIds.has(match[1]);
    match = path.match(/^\/uniques\/([^/]+)/);
    if (match) return uniqueIds.has(match[1]);
    match = path.match(/^\/glyphs\/([^/]+)/);
    if (match) return glyphIds.has(match[1]);
    if (path === '/paragonBoards') return (build?.boards || []).length > 0;
    match = path.match(/^\/paragonBoards\/([^/]+)/);
    if (match) return boardIds.has(match[1]);
    match = path.match(/^\/paragonNodes\/([^/]+)/);
    if (match) return nodeIds.has(match[1]);
    if (path === '/mainstat' || path.startsWith('/mainstat/')) return true;
    const prefix = build?.id ? `/builds.json/builds/${build.id}/` : '';
    if (prefix && (path === prefix.slice(0, -1) || path.startsWith(prefix))) {
      const head = path.slice(prefix.length).split('/')[0];
      if (head === 'gear') return REQUIRED_GEAR_KEYS.has(path.split('/').at(-1));
      return REQUIRED_STAT_KEYS.has(head);
    }
    return false;
  }

  const required = [];
  const niceToHave = [];
  for (const item of items) (isRequired(item.path) ? required : niceToHave).push(item);
  return { required, niceToHave };
}
