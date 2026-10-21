import { BUCKETS } from './engine.js';

export function jaccardDistance(left, right) {
  const a = new Set(left || []);
  const b = new Set(right || []);
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return 1 - intersection / union;
}

export function bucketDistance(left, right) {
  if (!left || !right) return null;
  let total = 0;
  let count = 0;
  for (const key of BUCKETS) {
    const a = left[key];
    const b = right[key];
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    total += Math.min(1, Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9));
    count += 1;
  }
  if (!count) return null;
  return total / count;
}

export function metaIdentity(meta) {
  return [...(meta.skills || []), ...(meta.aspects || []), ...(meta.uniques || []), ...(meta.keyItems || [])];
}

export function noveltyAgainstMeta(keys, profile, metaDoc) {
  const real = (metaDoc?.builds || []).filter(build => build.example !== true);
  if (!real.length) {
    return { novelty: 1, jaccard: 1, bucket: 1, nearestId: null, compared: 0 };
  }
  const mine = [...(keys.skills || []), ...(keys.aspects || []), ...(keys.uniques || []), ...(keys.keyItems || [])];
  let best = null;
  for (const meta of real) {
    const jaccard = jaccardDistance(mine, metaIdentity(meta));
    const bucket = bucketDistance(profile, meta.bucketProfile);
    const novelty = bucket == null ? jaccard : (jaccard + bucket) / 2;
    if (!best || novelty < best.novelty) best = { novelty, jaccard, bucket, nearestId: meta.id };
  }
  return { ...best, compared: real.length };
}

export function rankByPowerNovelty(results, opts = {}) {
  const floor = opts.powerFloor ?? 0;
  const limit = opts.limit ?? 20;
  const includeUnverified = opts.includeUnverified === true;
  return results
    .filter(result => includeUnverified || result.unverifiedShare === 0)
    .filter(result => typeof result.power === 'number' && result.power >= floor)
    .map(result => ({ ...result, score: result.power * result.novelty }))
    .sort((a, b) => b.score - a.score || b.power - a.power)
    .slice(0, limit);
}
