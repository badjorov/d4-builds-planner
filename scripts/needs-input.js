import { readFileSync } from 'node:fs';
import { formatNeedsInput, needsInput, openNeeds, pendingAllocation } from '../src/needs-input.js';

const files = [
  ['../data/barbarian.json', ''],
  ['../data/builds.json', '/builds.json'],
  ['../data/meta-builds.json', '/meta-builds.json']
];

const items = files.flatMap(([path, root]) => needsInput(JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')), root));
items.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));
console.log(formatNeedsInput(items));
console.log('');
console.log(`open ${openNeeds(items).length}`);
console.log(`pending-allocation ${pendingAllocation(items).length}`);
const by = {};
for (const item of openNeeds(items)) {
  const cat = item.path.split('/').filter(Boolean)[0] || '(root)';
  by[cat] ??= { null: 0, unverified: 0, range: 0, empty: 0, total: 0 };
  by[cat][item.reason] = (by[cat][item.reason] || 0) + 1;
  by[cat].total += 1;
}
for (const key of Object.keys(by).sort()) console.log(`${key} ${JSON.stringify(by[key])}`);
