import { ENTITY_KEYS, entityTemplate, upsertEntity } from './catalog.js';
import { validate } from './schema.js';
import { formatNeedsInput, needsInput } from './needs-input.js';
import { esc } from './html.js';

const $ = (id) => document.getElementById(id);
const STORAGE = 'd4opt.catalog';
const TYPES = Object.keys(ENTITY_KEYS);

let catalog = null;
let bundled = null;
let schema = null;
let type = 'skill';
let draft = null;

function num(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function list() {
  return catalog[ENTITY_KEYS[type]] || [];
}

function renderChecklist() {
  const items = needsInput(catalog);
  $('checklistCount').textContent = `(${items.length})`;
  $('checklist').textContent = formatNeedsInput(items);
}

function renderList() {
  $('entityList').innerHTML = list().map(entity => `<li><button type="button" data-id="${esc(entity.id)}">${esc(entity.name || entity.id || '(unnamed)')} ${entity.verified ? '<span class="ver">✔</span>' : '<span class="unv">?</span>'}</button></li>`).join('')
    || '<li class="warn">No entries.</li>';
}

function field(label, html) {
  return `<label>${esc(label)}<br>${html}</label><br>`;
}

function textInput(name, value) {
  return `<input name="${esc(name)}" type="text" value="${esc(value ?? '')}">`;
}

function effectRows(effects) {
  const rows = effects?.length ? effects : [];
  return rows.map((effect, index) => `<fieldset data-effect="${index}"><legend>Effect ${index + 1}</legend>
    ${field('Stat', textInput(`stat-${index}`, effect.stat))}
    ${field('Bucket', `<select name="bucket-${index}">${['', 'additive', 'multiplicative', 'crit', 'vuln', 'overpower', 'mainstat', 'special', 'none', 'additive?', 'vuln?'].map(bucket => `<option ${effect.bucket === bucket || (effect.bucket == null && bucket === '') ? 'selected' : ''}>${esc(bucket)}</option>`).join('')}</select>`)}
    ${field('Value or min,max', textInput(`value-${index}`, Array.isArray(effect.value) ? effect.value.join(',') : effect.value ?? ''))}
    ${field('Conditions (blank = unknown, - = none)', textInput(`conditions-${index}`, effect.conditions == null ? '' : effect.conditions.length ? effect.conditions.join(', ') : '-'))}
    ${field('Stacking rule', textInput(`stacking-${index}`, effect.stacking))}
    ${field('Source URL', textInput(`effectSource-${index}`, effect.source))}
    ${field('Note', textInput(`effectNote-${index}`, effect.note))}
    <label><input name="effectVerified-${index}" type="checkbox" ${effect.verified ? 'checked' : ''}> Verified</label>
    <button type="button" data-remove-effect="${index}">Remove effect</button>
  </fieldset>`).join('') + '<button type="button" id="addEffect">Add effect</button>';
}

function renderForm() {
  if (!draft) {
    $('entityForm').innerHTML = '<p>Select an entity or start a new one.</p>';
    return;
  }
  const parts = [
    field('Id', textInput('id', draft.id)),
    field('Name', textInput('name', draft.name)),
    field('Source URL', textInput('source', draft.source)),
    `<label><input name="verified" type="checkbox" ${draft.verified ? 'checked' : ''}> Verified</label><br>`,
    field('Note', `<textarea name="note">${esc(draft.note || '')}</textarea>`)
  ];
  if (type === 'skill') {
    parts.push(
      field('Category', textInput('category', draft.category)),
      field('Tags', textInput('tags', (draft.tags || []).join(', '))),
      field('Coefficient %', `<input name="coeffPct" type="number" value="${draft.coeffPct ?? ''}">`),
      field('Rank', `<input name="rank" type="number" value="${draft.rank ?? ''}">`),
      field('DoT', `<select name="dot"><option value="" ${draft.dot == null ? 'selected' : ''}>unknown</option><option value="true" ${draft.dot === true ? 'selected' : ''}>true</option><option value="false" ${draft.dot === false ? 'selected' : ''}>false</option></select>`),
      field('Fury generated / cast', `<input name="furyGeneratePerCast" type="number" value="${draft.furyGeneratePerCast ?? ''}">`),
      field('Fury spent / cast', `<input name="furySpendPerCast" type="number" value="${draft.furySpendPerCast ?? ''}">`),
      field('Variant of skill id', textInput('variantOf', draft.variantOf))
    );
  }
  if (type === 'skillVariant') parts.push(field('Skill id', textInput('skillId', draft.skillId)));
  if (type === 'aspect' || type === 'unique') parts.push(field('Slots (blank = unknown)', textInput('slots', Array.isArray(draft.slots) ? draft.slots.join(', ') : '')));
  if (type === 'affix') parts.push(field('Slot', textInput('slot', draft.slot)));
  if (type === 'paragonNode') parts.push(field('Board id', textInput('boardId', draft.boardId)));
  if (type === 'paragonBoard') parts.push(field('Node ids', textInput('nodeIds', (draft.nodeIds || []).join(', '))));
  if (type === 'glyph') parts.push(field('Level', `<input name="level" type="number" value="${draft.level ?? ''}">`));
  if (draft.effects) parts.push(effectRows(draft.effects));
  parts.push('<p><button type="submit">Save</button> <button type="button" id="deleteEntity">Delete</button></p>');
  $('entityForm').innerHTML = parts.join('');
}

function readValue(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.includes(',')) return text.split(',').map(part => num(part.trim()));
  return num(text);
}

function readConditions(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text === '-') return [];
  return text.split(',').map(part => part.trim()).filter(Boolean);
}

function readForm(form) {
  const data = new FormData(form);
  const next = entityTemplate(type);
  next.id = String(data.get('id') || '').trim();
  next.name = String(data.get('name') || '');
  if (type !== 'paragonBoard' && type !== 'seasonalMechanic' && type !== 'talisman') next.name = next.name || next.id;
  if (next.name === '') next.name = null;
  next.source = String(data.get('source') || '').trim() || 'manual-entry';
  next.verified = data.get('verified') === 'on';
  const note = String(data.get('note') || '').trim();
  if (note) next.note = note;
  else delete next.note;
  if (type === 'skill') {
    next.category = String(data.get('category') || '').trim() || null;
    next.tags = String(data.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean);
    next.coeffPct = num(data.get('coeffPct'));
    next.rank = num(data.get('rank'));
    next.dot = data.get('dot') === '' ? null : data.get('dot') === 'true';
    next.furyGeneratePerCast = num(data.get('furyGeneratePerCast'));
    next.furySpendPerCast = num(data.get('furySpendPerCast'));
    next.variantOf = String(data.get('variantOf') || '').trim() || null;
  }
  if (type === 'skillVariant') next.skillId = String(data.get('skillId') || '').trim() || null;
  if (type === 'aspect' || type === 'unique') {
    const slots = String(data.get('slots') || '').split(',').map(slot => slot.trim()).filter(Boolean);
    next.slots = slots.length ? slots : null;
  }
  if (type === 'affix') next.slot = String(data.get('slot') || '').trim() || null;
  if (type === 'paragonNode') next.boardId = String(data.get('boardId') || '').trim() || null;
  if (type === 'paragonBoard') next.nodeIds = String(data.get('nodeIds') || '').split(',').map(id => id.trim()).filter(Boolean);
  if (type === 'glyph') next.level = num(data.get('level'));
  if (next.effects) {
    const effects = [];
    let index = 0;
    while (data.has(`effectSource-${index}`) || form.querySelector(`[data-effect="${index}"]`)) {
      const effect = {
        stat: String(data.get(`stat-${index}`) || '').trim() || null,
        bucket: String(data.get(`bucket-${index}`) || '').trim() || null,
        value: readValue(data.get(`value-${index}`)),
        conditions: readConditions(data.get(`conditions-${index}`)),
        stacking: String(data.get(`stacking-${index}`) || '').trim() || null,
        source: String(data.get(`effectSource-${index}`) || '').trim() || next.source,
        verified: data.get(`effectVerified-${index}`) === 'on'
      };
      const effectNote = String(data.get(`effectNote-${index}`) || '').trim();
      if (effectNote) effect.note = effectNote;
      effects.push(effect);
      index += 1;
      if (index > 30) break;
    }
    next.effects = effects;
  }
  return next;
}

function showErrors(result) {
  $('formError').textContent = result.ok ? '' : result.errors.slice(0, 8).map(error => `${error.path} ${error.message}`).join('\n');
}

function persist() {
  localStorage[STORAGE] = JSON.stringify(catalog);
  renderList();
  renderChecklist();
}

function selectEntity(id) {
  const found = list().find(entity => entity.id === id);
  draft = found ? structuredClone(found) : null;
  renderForm();
}

$('entityType').innerHTML = TYPES.map(name => `<option value="${name}">${name}</option>`).join('');
$('entityType').addEventListener('change', () => {
  type = $('entityType').value;
  draft = null;
  renderList();
  renderForm();
});
$('newEntity').addEventListener('click', () => {
  draft = entityTemplate(type);
  renderForm();
});
$('entityList').addEventListener('click', (event) => {
  const id = event.target?.closest?.('button[data-id]')?.dataset?.id;
  if (id) selectEntity(id);
});
$('entityForm').addEventListener('click', (event) => {
  const remove = event.target?.dataset?.removeEffect;
  if (remove != null && draft) {
    draft = readForm($('entityForm'));
    draft.effects.splice(Number(remove), 1);
    renderForm();
  }
  if (event.target?.id === 'addEffect' && draft) {
    draft = readForm($('entityForm'));
    draft.effects.push({ stat: null, bucket: null, value: null, conditions: null, stacking: null, source: draft.source || 'manual-entry', verified: false });
    renderForm();
  }
  if (event.target?.id === 'deleteEntity' && draft?.id) {
    catalog[ENTITY_KEYS[type]] = list().filter(entity => entity.id !== draft.id);
    draft = null;
    persist();
    renderForm();
  }
});
$('entityForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const next = readForm(event.target);
  if (!next.id) {
    $('formError').textContent = 'Id is required.';
    return;
  }
  const snapshot = structuredClone(catalog);
  upsertEntity(catalog, ENTITY_KEYS[type], next);
  const result = validate(schema, catalog);
  if (!result.ok) {
    catalog = snapshot;
    showErrors(result);
    return;
  }
  draft = next;
  persist();
  $('formError').textContent = 'Saved in this browser. Export JSON to keep it in the repo.';
});
$('exportCatalog').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' }));
  link.download = 'barbarian.json';
  link.click();
});
$('importCatalog').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text());
  const result = validate(schema, parsed);
  if (!result.ok) {
    showErrors(result);
    return;
  }
  catalog = parsed;
  draft = null;
  persist();
  renderForm();
  $('status').textContent = 'Imported catalog.';
});
$('resetCatalog').addEventListener('click', () => {
  catalog = structuredClone(bundled);
  delete localStorage[STORAGE];
  draft = null;
  persist();
  delete localStorage[STORAGE];
  renderForm();
  $('status').textContent = 'Restored the bundled catalog.';
});

bundled = await (await fetch('data/barbarian.json')).json();
schema = await (await fetch('data/schema/catalog.schema.json')).json();
catalog = structuredClone(bundled);
if (localStorage[STORAGE]) $('status').textContent = 'Bundled catalog loaded. This browser also has a local edit; Reset clears it, or import a file. Showing the bundled file.';
else $('status').textContent = 'Bundled catalog loaded.';
renderList();
renderForm();
renderChecklist();
