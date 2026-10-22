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

const KNOWN_BUCKETS = new Set(['additive', 'multiplicative', 'crit', 'vuln', 'overpower']);
const NON_DAMAGE_KINDS = new Set(['defense', 'resource', 'mobility', 'utility', 'base-weapon']);

function scoresDamage(effect) {
  return !NON_DAMAGE_KINDS.has(effect?.kind);
}

function entityById(list, id) {
  return (list || []).find(entry => entry.id === id) || null;
}

function effectAt(entity, index) {
  const effect = entity?.effects?.[index];
  if (!effect) return null;
  const value = effect.value;
  return {
    effect,
    number: typeof value === 'number' && Number.isFinite(value),
    range: Array.isArray(value),
    knownBucket: KNOWN_BUCKETS.has(effect.bucket),
    conditionsRead: typeof value === 'number' && Number.isFinite(value) && KNOWN_BUCKETS.has(effect.bucket)
  };
}

function storedText(entity, effect) {
  return [entity?.description, entity?.tooltip, entity?.transcribed, effect?.stat, effect?.note].filter(Boolean).join('\n');
}

function fromBlizzard(entity, effect) {
  const source = effect?.source || entity?.source;
  return String(source || '').includes('news.blizzard.com');
}

function bucketSourceable(entity, effect) {
  if (fromBlizzard(entity, effect)) return true;
  return /\[\s*[x+]\s*\]/i.test(`${effect?.stat || ''}\n${effect?.note || ''}`);
}

function conditionsSourceable(entity, effect) {
  if (fromBlizzard(entity, effect)) return true;
  return /\b(while|when|after|against|whenever|during)\b/i.test(storedText(entity, effect));
}

function scoringContext(build, catalog) {
  const skillIds = new Set(build?.skills || []);
  const aspects = new Map();
  const uniques = new Map();
  for (const slot of build?.gear || []) {
    if (slot.aspectId) {
      const entity = entityById(catalog.aspects, slot.aspectId);
      if (entity) aspects.set(entity.id, entity);
    }
    if (slot.uniqueId) {
      const entity = entityById(catalog.uniques, slot.uniqueId);
      if (entity) uniques.set(entity.id, entity);
    }
  }
  const skills = new Map();
  for (const id of skillIds) {
    const skill = entityById(catalog.skills, id);
    if (skill) skills.set(id, skill);
  }
  return {
    buildId: build?.id || '',
    skillCount: skillIds.size,
    skills,
    aspects,
    uniques
  };
}

function classifyScoringField(item, ctx) {
  const path = item.path;
  const prefix = ctx.buildId ? `/builds.json/builds/${ctx.buildId}/` : '';
  if (prefix && path.startsWith(prefix)) {
    const rest = path.slice(prefix.length);
    const field = rest.split('/').at(-1);
    const blockingStats = new Set(['vulnerable', 'overpower', 'armorMitigationPct', 'resistMitigationPct', 'dr']);
    const requiredStats = new Set(['weaponDmg', 'mainStat', 'critChance', 'critDmg', 'vulnPct', 'overpowerPct', 'life']);
    if (rest.startsWith('uptime/') && blockingStats.has(field)) return { tier: 'engine-blocking', provenance: 'user-only' };
    if (rest.startsWith('defense/') && blockingStats.has(field)) return { tier: 'engine-blocking', provenance: 'user-only' };
    if (requiredStats.has(field) && (item.reason === 'null' || item.reason === 'range')) return { tier: 'required', provenance: 'user-only' };
    return { tier: 'nice-to-have' };
  }

  let match = path.match(/^\/skills\/([^/]+)\/([^/]+)$/);
  if (match && ctx.skills.has(match[1])) {
    if (match[2] === 'coeffPct' && item.reason === 'null') return { tier: 'required', provenance: 'user-only' };
    if (match[2] === 'dot' && item.reason === 'null') return { tier: 'engine-blocking', provenance: 'user-only' };
    return { tier: 'nice-to-have' };
  }

  match = path.match(/^\/(aspects|uniques)\/([^/]+)\/effects\/(\d+)\/(value|bucket|conditions)$/);
  if (!match) return { tier: 'nice-to-have' };
  const collection = match[1] === 'aspects' ? ctx.aspects : ctx.uniques;
  const entity = collection.get(match[2]);
  if (!entity) return { tier: 'nice-to-have' };
  const fact = effectAt(entity, Number(match[3]));
  if (!fact) return { tier: 'nice-to-have' };
  const key = match[4];
  if (!scoresDamage(fact.effect)) return { tier: 'nice-to-have' };
  if (key === 'conditions') {
    if (!fact.conditionsRead || item.reason !== 'null') return { tier: 'nice-to-have' };
    return { tier: 'engine-blocking', provenance: conditionsSourceable(entity, fact.effect) ? 'sourceable' : 'user-only' };
  }
  if (key === 'bucket' && item.reason === 'null') {
    return { tier: 'engine-blocking', provenance: bucketSourceable(entity, fact.effect) ? 'sourceable' : 'user-only' };
  }
  if (key === 'value' && (item.reason === 'null' || item.reason === 'range')) {
    return { tier: 'engine-blocking', provenance: 'user-only' };
  }
  return { tier: 'nice-to-have' };
}

export function splitForBuild(items, build, catalog = {}) {
  const ctx = scoringContext(build, catalog);
  const engineBlocking = [];
  const required = [];
  const niceToHave = [];
  for (const item of items) {
    const role = classifyScoringField(item, ctx);
    if (role.tier === 'engine-blocking') engineBlocking.push({ ...item, provenance: role.provenance });
    else if (role.tier === 'required') required.push({ ...item, provenance: role.provenance });
    else niceToHave.push(item);
  }
  return { engineBlocking, required, niceToHave };
}

export function countProvenance(items) {
  const counts = { 'user-only': 0, sourceable: 0 };
  for (const item of items) if (counts[item.provenance] != null) counts[item.provenance] += 1;
  return counts;
}

export function topFieldNames(items, limit = 20) {
  const counts = new Map();
  for (const item of items) {
    const name = item.path.split('/').filter(Boolean).at(-1) || '(root)';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}
