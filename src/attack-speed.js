export const DEFAULT_ATTACK_SPEED_CAP = 120;
export const ATTACK_SPEED_CAP_LABEL = 'user-observed in-game, S15; recheck S16';

export function resolveAttackSpeedCap(opts = {}) {
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
  const overCap = wasted.reduce((sum, row) => sum + (typeof row.value === 'number' ? row.value : 0), 0);
  return {
    cap,
    label: ATTACK_SPEED_CAP_LABEL,
    overCap,
    wasted,
    note: 'The in-game sheet stays at the cap after the attack speed items are removed, so each of these affixes is past the cap.'
  };
}
