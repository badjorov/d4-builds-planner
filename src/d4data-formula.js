// FloatRangeWithIntervalUniqueAffixPityBonus and its random-range twin.
// The argument order below is unverified. It is the reading that lines up with
// the live unique tooltips we already stored (Furnace 75–100, Tuskhelm 40–50,
// Leoric 35–50). Legendary-rank arrays are stored and not applied.

const RANGE_WITH_RNG = /^FloatRangeWithIntervalUniqueAffixPityBonus\(\s*SharedRandomFloat\(\)\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*\)$/;
const RANDOM_RANGE = /^FloatRandomRangeWithIntervalUniqueAffixPityBonus\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*\)$/;
const LITERAL = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function round6(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value * 1e6) / 1e6;
}

export function bucketFromFormat(format) {
  if (!format) return null;
  const text = String(format).toLowerCase();
  if (text.includes('%x') || text.includes('x%')) return 'multiplicative';
  if (text.includes('%+') || text.includes('+%')) return 'additive';
  return null;
}

export function parseFormula(raw) {
  const text = raw == null ? '' : String(raw).trim();
  const empty = {
    raw: text || null,
    kind: text ? 'unparsed' : 'empty',
    step: null,
    min: null,
    max: null,
    literal: null,
    divisor: null,
    unverified: true
  };
  if (!text) return empty;
  let body = text;
  let divisor = null;
  const divided = text.match(/^(.*)\/\s*100\s*$/);
  if (divided) {
    body = divided[1].trim();
    divisor = 100;
  }
  const ranged = body.match(RANGE_WITH_RNG) || body.match(RANDOM_RANGE);
  if (ranged) {
    const step = Number(ranged[1]);
    const min = Number(ranged[2]);
    const max = Number(ranged[3]);
    return {
      raw: text,
      kind: body.startsWith('FloatRandom') ? 'random-range' : 'range-with-rng',
      step,
      min,
      max,
      literal: null,
      divisor,
      unverified: true
    };
  }
  const rank = parseLegendaryRank(body);
  if (rank) {
    return {
      raw: text,
      kind: 'legendary-rank',
      step: rank.perRank,
      min: rank.base,
      max: null,
      literal: null,
      divisor,
      rankOffset: rank.rankOffset,
      unverified: true
    };
  }
  if (LITERAL.test(body)) {
    const literal = Number(body);
    return {
      raw: text,
      kind: 'literal',
      step: null,
      min: literal,
      max: literal,
      literal,
      divisor,
      unverified: false
    };
  }
  return { ...empty, raw: text, divisor };
}

function parseLegendaryRank(body) {
  const cleaned = body.replace(/\s+/g, '');
  const patterns = [
    [/^([+-]?\d*\.?\d+)\+\(CurrentLegendaryRank\(\)-1\)\*([+-]?\d*\.?\d+)$/, 1],
    [/^([+-]?\d*\.?\d+)\+CurrentLegendaryRank\(\)\*([+-]?\d*\.?\d+)$/, 0],
    [/^([+-]?\d*\.?\d+)\+\(\(CurrentLegendaryRank\(\)-1\)\)$/, 1],
    [/^([+-]?\d*\.?\d+)\+\(CurrentLegendaryRank\(\)-1\)$/, 1],
    [/^([+-]?\d*\.?\d+)\+CurrentLegendaryRank\(\)-1$/, 1]
  ];
  for (const [pattern, rankOffset] of patterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    return {
      base: Number(match[1]),
      perRank: match[2] == null ? 1 : Number(match[2]),
      rankOffset
    };
  }
  return null;
}

export function parseTooltipTokens(text) {
  const tokens = [];
  if (!text) return tokens;
  for (const match of String(text).matchAll(/\[([^\]]+)\]/g)) {
    const parts = match[1].split('|');
    const expr = parts[0];
    const format = parts[1] || null;
    const value = expr.match(/Affix_Value_(\d+)/);
    const stat = expr.match(/Static[_ ]Value[_ ](\d+)/i);
    tokens.push({
      expr,
      format,
      affixValue: value ? Number(value[1]) : null,
      staticIndex: stat ? Number(stat[1]) : null,
      scale: /\*\s*100\b/.test(expr) ? 100 : 1,
      bucket: bucketFromFormat(format)
    });
  }
  return tokens;
}

export function classScope(flags) {
  if (!Array.isArray(flags) || flags.length < 3) return 'unknown';
  const ones = flags.reduce((sum, flag) => sum + (flag ? 1 : 0), 0);
  if (ones === 0) return 'unset';
  if (ones === flags.length) return 'generic';
  if (flags[2] === 1 && ones === 1) return 'barbarian';
  if (flags[2] === 1) return 'barbarian-and-others';
  return 'other-class';
}

export function inBarbarianScope(flags) {
  const scope = classScope(flags);
  return scope === 'barbarian' || scope === 'generic' || scope === 'barbarian-and-others' || scope === 'unset';
}

export const FORMULA_INTERPRETATION = [
  'FloatRangeWithIntervalUniqueAffixPityBonus(SharedRandomFloat(), step, min, max) is read as an inclusive roll from min to max.',
  'The first number after the random source is stored as step and is not applied as a filter.',
  'FloatRandomRangeWithIntervalUniqueAffixPityBonus(step, min, max) is the same triple with the random source left out.',
  'That order is unverified. It is the order that reproduces Furnace 75–100, Tuskhelm 40–50, Leoric 35–50, and the Blood-Mad Idol affix 80–100.',
  'On Ramaladni the stored step is 10 while the raw roll is 0.0035–0.005, so that first number may be an interval count instead of an absolute step. The raw argument is kept either way.',
  'arMaxLegendaryRanks is stored. bIgnoreLegendaryScaling is stored. Neither is applied to min or max. Masterwork, greater-affix, and legendary-rank scaling are not in these three arguments.',
  'A tooltip token Affix_Value_N*100 multiplies the parsed min and max by 100 before they are compared with a percent. The format specifier is read from that token: %x is multiplicative [x], %+ is additive [+], and a bare % is a plain percent with a null damage bucket.',
  'fAllowedForPlayerClass index 2 is Barbarian. A record is in scope when that index is 1, when every index is 1, or when every index is 0. Other indexes are not given class names.'
].join(' ');
