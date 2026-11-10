export const DEFAULT_ATTACK_SPEED_CAP = 120;
export const ATTACK_SPEED_CAP_LABEL = 'probable cap, estimate (inferred from the sheet never exceeding 120% in S15); recheck S16';

export function resolveAttackSpeedCap(opts = {}) {
  if (Object.hasOwn(opts, 'attackSpeedCap') && (opts.attackSpeedCap == null || opts.attackSpeedCap === Infinity)) return Infinity;
  return typeof opts.attackSpeedCap === 'number' ? opts.attackSpeedCap : DEFAULT_ATTACK_SPEED_CAP;
}

export function clampAttackSpeedPct(requested, opts = {}) {
  const cap = resolveAttackSpeedCap(opts);
  const effective = opts.ignoreAttackSpeedCap ? requested : Math.min(requested, cap);
  return {
    requested,
    cap,
    effective,
    overCap: Math.max(0, requested - effective),
    label: ATTACK_SPEED_CAP_LABEL
  };
}

export function isAttackSpeedText(text) {
  return /attack speed/i.test(text || '');
}

export function attackSpeedOverCap(catalog, build, opts = {}) {
  const cap = resolveAttackSpeedCap(opts);
  const wasted = [];
  for (const slot of build?.gear || []) {
    for (const placed of slot.affixes || []) {
      const affix = (catalog.affixes || []).find(item => item.id === placed.affixId);
      if (!affix) continue;
      const effect = (affix.effects || []).find(item => isAttackSpeedText(item.stat) || isAttackSpeedText(affix.name));
      if (!effect) continue;
      const value = typeof placed.value === 'number'
        ? placed.value
        : (typeof effect.value === 'number' ? effect.value : null);
      wasted.push({
        slotId: slot.slotId,
        affixId: affix.id,
        name: affix.name,
        value,
        worth: 0
      });
    }
  }
  if (!Number.isFinite(cap)) {
    return {
      cap,
      label: ATTACK_SPEED_CAP_LABEL,
      overCap: 0,
      wasted: [],
      note: 'attackSpeedCap is null or Infinity, so the run is uncapped and no attack speed affix is listed as past a cap.'
    };
  }
  const overCap = wasted.reduce((sum, row) => sum + (typeof row.value === 'number' ? row.value : 0), 0);
  return {
    cap,
    label: ATTACK_SPEED_CAP_LABEL,
    overCap,
    wasted,
    note: 'Probable cap, estimate (inferred from the sheet never exceeding 120% in S15); recheck S16. These affixes are listed as past that cap because removing them left the sheet at 120%.'
  };
}
