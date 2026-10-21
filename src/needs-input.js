const EMPTY_COLLECTIONS = ['skillVariants', 'affixes', 'paragonBoards', 'talismans'];

export function needsInput(catalog) {
  const items = [];
  walk(catalog, '', items);
  for (const key of EMPTY_COLLECTIONS) {
    if (Array.isArray(catalog?.[key]) && catalog[key].length === 0) {
      items.push({ path: `/${key}`, reason: 'empty', message: `/${key} is empty — no entries yet` });
    }
  }
  items.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));
  return items;
}

export function formatNeedsInput(items) {
  const lines = [`${items.length} field${items.length === 1 ? '' : 's'} need input`, ''];
  for (const item of items) lines.push(`${item.path} — ${item.reason} — ${item.message}`);
  return lines.join('\n');
}

function walk(value, path, items) {
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
      walk(entry, `${path}/${key}`, items);
    }
  }
}
