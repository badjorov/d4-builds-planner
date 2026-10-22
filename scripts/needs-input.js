import { readFileSync } from 'node:fs';
import { countProvenance, needsInput, openNeeds, pendingAllocation, splitForBuild, summarizeNeeds, topFieldNames } from '../src/needs-input.js';

const files = [
  ['../data/barbarian.json', ''],
  ['../data/builds.json', '/builds.json'],
  ['../data/meta-builds.json', '/meta-builds.json']
];

const loaded = Object.fromEntries(files.map(([path]) => {
  const name = path.split('/').pop();
  return [name, JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))];
}));
const items = files.flatMap(([path, root]) => needsInput(loaded[path.split('/').pop()], root));
items.sort((a, b) => a.path.localeCompare(b.path) || a.reason.localeCompare(b.reason));

const buildFlag = process.argv.indexOf('--build');
const which = buildFlag === -1 ? 'user' : process.argv[buildFlag + 1];
const builds = loaded['builds.json'].builds || [];
const build = which === 'user'
  ? builds.find(entry => entry.id === 'users-current-build') || builds[0]
  : builds.find(entry => entry.id === which) || builds[0];
const split = splitForBuild(items, build, loaded['barbarian.json']);

function printGroup(label, group) {
  console.log(`${label} ${group.length}`);
  const by = summarizeNeeds(group);
  for (const key of Object.keys(by).sort()) console.log(`${label} ${key} ${JSON.stringify(by[key])}`);
}

function printProvenance(label, group) {
  const counts = countProvenance(group);
  console.log(`${label} provenance user-only ${counts['user-only']} sourceable ${counts.sourceable}`);
}

printGroup('engine-blocking', split.engineBlocking);
printProvenance('engine-blocking', split.engineBlocking);
console.log('engine-blocking top-fields');
for (const [name, count] of topFieldNames(split.engineBlocking)) console.log(`engine-blocking field ${name} ${count}`);
console.log('engine-blocking user-only paths');
for (const item of split.engineBlocking.filter(entry => entry.provenance === 'user-only')) {
  console.log(`${item.path} — ${item.reason}`);
}
printGroup('required', split.required);
printProvenance('required', split.required);
printGroup('nice-to-have', split.niceToHave);
console.log(`pending-allocation ${pendingAllocation(items).length}`);
console.log(`open ${openNeeds(items).length}`);
console.log(`build ${build?.id || '(none)'}`);
