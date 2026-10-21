// Subset of JSON Schema 2020-12 used by data/schema/*.schema.json.
// Keywords: $ref, $defs, type, properties, required, additionalProperties,
// items, enum, const, minimum, maximum, minItems, maxItems, minLength, oneOf, anyOf.

export function validate(schema, data) {
  const errors = [];
  check(schema, data, '', schema, errors);
  return { ok: errors.length === 0, errors };
}

export function assertValid(schema, data) {
  const result = validate(schema, data);
  if (!result.ok) {
    const detail = result.errors.map(e => `${e.path || '/'} ${e.message}`).join('; ');
    throw new Error(`Schema validation failed: ${detail}`);
  }
  return data;
}

function check(schema, data, path, root, errors) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.$ref) {
    check(resolveRef(root, schema.$ref), data, path, root, errors);
    return;
  }
  if (schema.oneOf) {
    const hits = schema.oneOf.filter(option => checkQuiet(option, data, root));
    if (hits.length !== 1) {
      errors.push({ path, message: `must match exactly one oneOf alternative (matched ${hits.length})` });
    }
    return;
  }
  if (schema.anyOf) {
    const ok = schema.anyOf.some(option => checkQuiet(option, data, root));
    if (!ok) errors.push({ path, message: 'must match an anyOf alternative' });
    return;
  }
  if (schema.enum) {
    if (!schema.enum.some(value => Object.is(value, data))) {
      errors.push({ path, message: `must be one of ${schema.enum.map(v => JSON.stringify(v)).join(', ')}` });
    }
    return;
  }
  if (Object.prototype.hasOwnProperty.call(schema, 'const') && !Object.is(schema.const, data)) {
    errors.push({ path, message: `must be ${JSON.stringify(schema.const)}` });
  }
  if (schema.type !== undefined && !typeOk(schema.type, data)) {
    errors.push({ path, message: `must be ${[].concat(schema.type).join(' or ')}` });
    return;
  }
  if (typeof data === 'string' && typeof schema.minLength === 'number' && data.length < schema.minLength) {
    errors.push({ path, message: `must be at least ${schema.minLength} characters` });
  }
  if (typeof data === 'number') {
    if (typeof schema.minimum === 'number' && data < schema.minimum) errors.push({ path, message: `must be >= ${schema.minimum}` });
    if (typeof schema.maximum === 'number' && data > schema.maximum) errors.push({ path, message: `must be <= ${schema.maximum}` });
  }
  if (Array.isArray(data)) {
    if (typeof schema.minItems === 'number' && data.length < schema.minItems) errors.push({ path, message: `must have at least ${schema.minItems} items` });
    if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) errors.push({ path, message: `must have at most ${schema.maxItems} items` });
    if (schema.items) data.forEach((item, i) => check(schema.items, item, `${path}/${i}`, root, errors));
  }
  if (isObject(data) && (schema.properties || schema.additionalProperties === false || schema.required)) {
    const props = schema.properties || {};
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) errors.push({ path: `${path}/${key}`, message: 'is required' });
    }
    for (const key of Object.keys(data)) {
      if (props[key]) check(props[key], data[key], `${path}/${key}`, root, errors);
      else if (schema.additionalProperties === false) errors.push({ path: `${path}/${key}`, message: 'is not allowed' });
      else if (isObject(schema.additionalProperties)) check(schema.additionalProperties, data[key], `${path}/${key}`, root, errors);
    }
  }
}

function checkQuiet(schema, data, root) {
  const errors = [];
  check(schema, data, '', root, errors);
  return errors.length === 0;
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref ${ref}`);
  let node = root;
  for (const part of ref.slice(2).split('/')) {
    node = node?.[part];
    if (node === undefined) throw new Error(`Unresolvable $ref ${ref}`);
  }
  return node;
}

function typeOk(type, data) {
  const types = Array.isArray(type) ? type : [type];
  return types.some(kind => {
    if (kind === 'null') return data === null;
    if (kind === 'array') return Array.isArray(data);
    if (kind === 'object') return isObject(data);
    if (kind === 'integer') return typeof data === 'number' && Number.isInteger(data);
    if (kind === 'number') return typeof data === 'number' && Number.isFinite(data);
    return typeof data === kind;
  });
}

function isObject(data) {
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}
