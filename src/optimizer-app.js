import { optimize } from './search.js';
import { evaluateBuild } from './catalog.js';
import { esc } from './html.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const catalogUrl = params.get('catalog') || 'data/barbarian.json';
const metaUrl = params.get('meta') || 'data/meta-builds.json';

function num(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function drList(value) {
  if (value == null || String(value).trim() === '') return null;
  return String(value).split(',').map(part => num(part.trim()));
}

let catalog = null;
let metaBuilds = { builds: [] };
let savedBuild = null;

function selectedTags() {
  return [...document.querySelectorAll('#tags input:checked')].map(input => input.value);
}

function renderTags() {
  const tags = [...new Set((catalog.skills || []).flatMap(skill => skill.tags || []))].sort();
  $('tags').innerHTML = tags.map(tag => `<label><input type="checkbox" value="${esc(tag)}"> ${esc(tag)}</label>`).join(' ')
    || '<span class="warn">No skill tags in this catalog.</span>';
}

function renderResults(out) {
  const rows = out.ranked;
  const equipped = savedBuild ? evaluateBuild(catalog, { ...savedBuild, skills: ['whirlwind'] }) : null;
  const equippedText = equipped
    ? ` Equipped Whirlwind power ${equipped.result.total.toFixed(2)}.`
    : '';
  $('summary').textContent = `${rows.length} ranked of ${out.considered} scored. ${out.rejectedCount} rejected by constraints.${equippedText} Equipped paragon nodes and glyphs are scored. Which nodes, glyphs, boards, and talismans to equip was not searched.`;
  if (!rows.length) {
    $('results').innerHTML = '<p class="warn">No build passed the power floor and the verification filter. Leave manual inputs blank only when you mean null, or turn on unverified data. The data-entry page lists every null and unverified field.</p>';
    return;
  }
  $('results').innerHTML = rows.map((result, index) => `<article class="result">
    <h2>${index + 1}. ${esc(result.name)}</h2>
    <p>Power <b>${result.power.toFixed(2)}</b> × novelty <b>${result.novelty.toFixed(3)}</b> = score <b>${result.score.toFixed(2)}</b>.
    Unverified data <b>${(result.unverifiedShare * 100).toFixed(1)}%</b>.</p>
    <pre class="why">${esc(result.why)}</pre>
  </article>`).join('');
}

function run() {
  const defense = {
    life: num($('life').value),
    armor: num($('armor').value),
    resists: num($('resists').value),
    armorMitigationPct: num($('armorMitigationPct').value),
    resistMitigationPct: num($('resistMitigationPct').value),
    dr: drList($('dr').value)
  };
  const out = optimize(catalog, {
    tags: selectedTags(),
    maxSkills: num($('maxSkills').value) ?? catalog.constraints?.skillBarSize ?? 1,
    beamWidth: num($('beamWidth').value) ?? 3,
    powerFloor: num($('powerFloor').value) ?? 0,
    includeUnverified: $('includeUnverified').checked,
    manualInputsVerified: $('manualInputsVerified').checked,
    weaponDmg: num($('weaponDmg').value),
    mainStat: num($('mainStat').value),
    critChance: num($('critChance').value),
    critDmg: num($('critDmg').value),
    vulnPct: num($('vulnPct').value),
    overpowerPct: num($('overpowerPct').value),
    castsPerSecond: num($('castsPerSecond').value),
    uptime: {
      berserk: num($('upBerserk').value),
      vulnerable: num($('upVulnerable').value),
      overpower: num($('upOverpower').value),
      channeling: num($('upChanneling').value),
      furyAbove50: num($('upFury').value),
      unstoppable: num($('upUnstoppable').value),
      fortified: num($('upFortified').value)
    },
    defense,
    minimums: {
      furyPerSecond: num($('minFury').value),
      berserk: num($('minBerserk').value),
      vulnerable: num($('minVulnerable').value),
      overpower: num($('minOverpower').value),
      ehp: num($('minEhp').value)
    },
    metaBuilds,
    boards: savedBuild?.boards || [],
    glyphs: savedBuild?.glyphs || [],
    limit: 20
  });
  renderResults(out);
}

$('run').addEventListener('click', run);

try {
  catalog = await (await fetch(catalogUrl)).json();
  metaBuilds = await (await fetch(metaUrl)).json();
  const buildsUrl = params.get('builds') || 'data/builds.json';
  const buildsFile = await (await fetch(buildsUrl)).json();
  savedBuild = (buildsFile.builds || []).find(build => build.id === 'users-current-build') || null;
  const cap = catalog.constraints?.skillBarSize;
  if (typeof cap === 'number') $('maxSkills').value = String(cap);
  renderTags();
  const label = catalog.meta?.synthetic ? 'SYNTHETIC fixture catalog' : `${catalog.meta?.class || 'Catalog'} patch ${catalog.meta?.patch || ''}`;
  $('status').textContent = `Loaded ${label}. Default ranking hides any build that still has null or unverified data.`;
} catch (error) {
  $('status').textContent = `Could not load the catalog (${error.message}). Serve this folder with npm start.`;
}
