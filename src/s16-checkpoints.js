// Watch items for the Season 16 Double Swing plan. File numbers are from 3.3_ptr.
// Anything marked estimate is not a confirmed stacking rule.

export const WEAPON_APS = 1.1;
export const NON_GEAR_ATTACK_SPEED = 12.5;
export const ATTACK_SPEED_CAP = 120;

export const SHOUTS = [
  { id: 'rallying-cry', name: 'Rallying Cry', duration: 4, cooldown: 0, file: 'Barbarian_RallyingCry. tCooldownTime is 0 unless Upgrade C. Duration on the 10 Nov tooltip is 4.0s.' },
  { id: 'war-cry', name: 'War Cry', duration: 4, cooldown: 25, file: 'Barbarian_WarCry. tCooldownTime is 25. SF_28 is 4.' },
  { id: 'challenging-shout', name: 'Challenging Shout', duration: 8, cooldown: 25, file: 'Barbarian_ChallengingShout. SF_6 is 25. SF_3 is 8.' },
  { id: 'wrath', name: 'Wrath of the Berserker', duration: 16, cooldown: 90, file: 'Barbarian_WrathoftheBerserker. SF_1 is 90. SF_44 is 10 × Table(37), which is 16 at rank 39.' },
  { id: 'iron-skin', name: 'Iron Skin', duration: 3, cooldown: 14, file: 'Barbarian_IronSkin. SF_2 is 14. SF_3 is 3.' }
];

export function castRate(attackSpeedPct) {
  return WEAPON_APS * (1 + attackSpeedPct / 100);
}

export function cdrNeeded(duration, cooldown) {
  if (!cooldown) return null;
  return 1 - duration / cooldown;
}

export function shoutTable(sheetCdr = 0.09) {
  return SHOUTS.map(skill => {
    const needed = cdrNeeded(skill.duration, skill.cooldown);
    const uptime = skill.cooldown ? Math.min(1, skill.duration / (skill.cooldown * (1 - sheetCdr))) : null;
    return {
      ...skill,
      cdrNeeded: needed,
      gapAtSheet: needed == null ? null : needed - sheetCdr,
      uptimeAtSheet: uptime
    };
  });
}

export function wrathUptime(sheetCdr, marshalSeconds = 0) {
  const remain = 1 - sheetCdr;
  const shoutCd = 25 * remain;
  const raw = 90 * remain;
  const shouts = marshalSeconds ? raw / shoutCd * 2 : 0;
  const effective = raw - shouts * marshalSeconds;
  return { effectiveCooldown: effective, uptime: Math.min(1, 16 / effective) };
}

export function furyStage(stage) {
  const drain = 0.07 * stage.maxFury;
  const spend = stage.costPerCast * stage.casts;
  const have = stage.regen + (stage.extra || 0);
  return {
    id: stage.id,
    drain,
    spend,
    need: drain + spend,
    have,
    gap: drain + spend - have
  };
}

export function attackStage(id, bonusPct) {
  return {
    id,
    bonusPct,
    cap: ATTACK_SPEED_CAP,
    distance: ATTACK_SPEED_CAP - bonusPct,
    casts: castRate(bonusPct)
  };
}

export function averageAtAttackSpeed(dpsAtSheet, attackSpeedPct) {
  return dpsAtSheet * (castRate(attackSpeedPct) / castRate(NON_GEAR_ATTACK_SPEED));
}

export function critStepValue(dpsAtFullCrit, additivePct, critDamagePct) {
  const additive = 1 + additivePct / 100;
  const full = (additive + critDamagePct / 100) / additive;
  const fraction = 0.1 * (full - 1) / full;
  return { full, fraction, dps: dpsAtFullCrit * fraction };
}
