# Season 16 Barbarian builds (provisional)

Season 16, patch 3.3.0 PTR build 3.3.0.74145. Every row is `provisional: true`. These are short name lists from the user's research notes. Guide text is not copied.

Soul Splinters are gone on the PTR, so these builds have **no soul stacks**. The Season 15 calibration stays stored. Souls on this score are 0. There is no further splinter or charm check.

The score uses the calibrated defaults: Overpower `total`, headline crit, and damage over time does not crit. The combat sheet, paragon nodes, and glyphs stay Nikolay's. His weapon affix [x] crit lines are not in these lists, so they are left off. Combat Fury 826 is his observed reading and is an estimate here. A Healthy Vulnerable boss is the peak (all-buff high, elite, overpower, berserk, unstoppable). The average is the 60s timeline.

## Placeholder

**Double Swing** is waiting for Nikolay's own setup. Until that list arrives, the row uses the research-note list. The placeholder is marked `waiting` on `s16-double-swing`.

## Double Swing

Skills: Double Swing, War Cry, Rallying Cry, Challenging Shout, Wrath of the Berserker, Lunging Strike. The sixth slot is unconfirmed. Elyxir lists Iron Skin, Steel Grasp, or Lunging Strike, and this row uses Lunging Strike. Link: https://www.elyxir.gg/guide/diablo-iv/diablo-iv-season-16-ptr-double-swing-barbarian-defense-and-positioning-guide

Uniques: Fists of Fate, Ramaladni's Magnum Opus, Tibault's Will, Ring of Red Furor.

Aspects: Earthstriker's, Crushing, Disobedience.

Sets: Sescheron's Fury, Berserker's Crucible.

Other: Vehement Halo, Ambidextrous, 1H Mace Expertise.

Links: https://legends.army/video/rob57ftu and https://d4gold.com/news/diablo-4-season-16-ptr-3-3-0-patch-notes-changes-for-double-swing-barbarian

## Whirlwind (Sescheron's + Crucible)

Skills: Whirlwind, Rallying Cry, Challenging Shout, Iron Skin, War Cry, Wrath of the Berserker.

Uniques: Ramaladni's Magnum Opus. Optional, not in the score: Melted Heart of Selig, Disobedience.

Aspects: Accursed Touch.

Sets: Sescheron's Fury, Berserker's Crucible.

Paragon names: Warbringer, Carnage, Decimator, Weapons Master.

Link: https://www.elyxir.gg/guide/diablo-iv/diablo-iv-ptr-whirlwind-barbarian-guide-bigger-spins-and-better-positioning

## Flay bleed

The S16 gear list was not published. The names below are the legacy core. Bloodletter's Flow is an inference. Gear confidence is low.

Skills: Flay, Rupture, War Cry, Challenging Shout, Rallying Cry, Wrath of the Berserker.

Uniques: Hooves of the Mountain God, Shard of Verathiel, Ramaladni's Magnum Opus, Tibault's Will, Paingorger's Gauntlets.

Aspects: Moonrise.

Sets: Bloodletter's Flow.

Links: https://d4guides.gg/en/news/season-16-tier-list-after-the-ptr-who-clears-tower-150 , https://www.wowhead.com/diablo-4/guide/classes/barbarian/flay-build-overview , https://d4guides.gg/en/build/barbarian-flay , and https://d4guides.gg/en/database/horadric-affixes/bloodletters-flow

## Names against the PTR catalog

Resolved ids are in `data/s16-builds.json`. Berserker's Crucible and Bloodletter's Flow match the set tags. The charm items are named "of the Crucible" and "of the Bloodletter".

One-Handed Mace Expertise resolves to `Power_Barbarian_WeaponExpertise_1HMace`. The string is that name. It is 1%[x] per expertise level, doubled with two maces, against Stunned enemies or Bosses.

Flay's power file is `Barbarian_Maim`. The string name is Flay.

The sixth Double Swing skill is Lunging Strike, and that choice is unconfirmed. No name in these three lists is left unresolved.

## Skill rank

`SkillRankBonus` is `PowerFormulaTables.gam.json`, the same 151 values on 3.2 and 3.3_ptr. Index equals rank. Index 0 is present. Rank 41 is index 41 and the value is **5.40**. The fit `1 + 0.1(r−1) + 0.05·floor(r/5)` matches `flValue[r]` for ranks 1 through 150. It does not match if the array is read as rank = index + 1.

The default rank is **41**, Nikolay's Whirlwind rank, and it is an estimate for the other skills. `scoreS16(..., { rank })` changes it. Double Swing and Flay are stored at rank 10 in the catalog. Those stored ranks are not the S16 default.

## Coefficients

The previous S16 pass used the rank-1 constants. This pass uses the tooltip-equivalent at rank 41, which is the basis of the 386% Whirlwind calibration. Whirlwind's per-hit payload also divides by attack speed. The calibrated model scores the tooltip number and does not divide by attack speed again, so these coefficients do the same.

| Skill | Stored | Previous S16 coeff | Rank 41 coeff |
| --- | ---: | ---: | ---: |
| Whirlwind | 386% | 165% | **386.1%** = 165% × 13/30 × 5.40 |
| Double Swing | 114% | 150% for one sweep | **810% per sweep, 1,620% for both sweeps** = 150% × 5.40 × 2 |
| Flay bleed | 45% over 5s | 115% over 5s | **621% over 5s, then ×1.8 = 1,117.8%** |

Whirlwind's formulas and tooltip strings match on 3.2 and 3.3_ptr. It is not a nerf. Live 3.2 Double Swing `SF_1` is 0.75, half of the PTR 1.5. At the stored rank 10, 75% × SkillRankBonus[10] is 150%, not the stored 114%.

Optional Double Swing hits, off in this table: Flurry adds 0.5× per sweep, Slice and Dice adds one 1.2× outer hit, and the Twister tooltip payload is 0.5× one sweep. Pass `variants: { flurry, sliceAndDice, twister }` to turn them on.

## Damage per second

Rank 41. Attack speed input +120% (estimate, the S15 sheet). The 60s buff timeline is unchanged. Peak DPS is the full-overlap window at a full Fury globe. Average DPS is the 60s average, reduced by the sustainable casting fraction when the rotation cannot be held.

Whirlwind uses frame breakpoints. Per-tick damage stays the rank-41 tooltip value, the stored 386% basis. Ticks per second are `60 / frames`. The +120% sheet bonus lands on the 91% step: 13 frames, 4.615 ticks/s. This is community-measured S15 (3.2), recheck after S16 launch. The frame counts are the 2H steps from [attack speed mechanics](https://maxroll.gg/d4/resources/attack-speed-mechanics) and the [Whirlwind barbarian guide](https://maxroll.gg/d4/build-guides/whirlwind-barbarian-guide). The spin weapon is a 2H polearm. Polearm-specific frames are an estimate: the measured 0% group is 2H axe, polearm, or mace at 26 frames, and the steps are that 2H table. Ramaladni's Magnum Opus is the one-handed sword in the 1H slot. 1H and 2H sword have a measured frame count only at 0% attack speed. Above 0% their frames follow the 2H ratio, and that interpolation is flagged.

`attackSpeedCap` defaults to 120%. The label is probable cap, estimate (inferred from the sheet never exceeding 120% in S15); recheck S16. Pass null or Infinity for an uncapped run. With the default, effective attack speed is clamped to 120% for Whirlwind breakpoints, Double Swing and Flay cast rates, and Lucky Hit or on-hit scaling. The 143.5% breakpoint is above that probable cap. Its row stays in the table as a reference and is left out of the scored build.

`whirlwindAttackSpeedModel: 'flat'` keeps the literal formula reading. In that reading the tick rate and the per-tick damage move together, so damage per second stays at the 1.0 APS rate of `30/13` ticks.

| Build | Peak min | Peak max | Average min | Average max |
| --- | ---: | ---: | ---: | ---: |
| Double Swing | 501.22B/s | 1,178.26B/s | 282.12B/s | 620.37B/s |
| Whirlwind, breakpoints at +120% | 66.53B/s | 87.72B/s | 72.10B/s | 95.06B/s |
| Whirlwind, flat formulas | 33.27B/s | 43.86B/s | 36.05B/s | 47.53B/s |
| Flay bleed | 2.57B/s | 5.73B/s | 0.38B/s | 0.61B/s |

Whirlwind's average is above its peak because the Crucible 200%[x] starts after 5 seconds of Berserking. The full-overlap peak is the first 4 seconds of War Cry.

Lucky Hit and on-hit effects scale with the tick rate. Dust Devils and flat-per-second damage-over-time effects stay on their own timer. The Whirlwind number above is direct-hit damage. Accursed Touch is on the skill list, and its Lucky Hit effect sits outside this damage number. Dust Devil hits stay unscored.

### Whirlwind, each 2H breakpoint

The +120% default lands on the 91% row. Generation is town Fury regeneration 85/s minus Ramaladni's 7% drain of 826 Fury. Every row covers 60 seconds. At 91% the pool lasts 292.9 seconds. At 143.5% it lasts 69.9 seconds.

| Attack speed | Frames | Ticks/s | Peak min | Peak max | Average min | Average max | Fury cost | Generation | Net | 60s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0% | 26 | 2.308 | 33.27B/s | 43.86B/s | 36.05B/s | 47.53B/s | 15.00 | 27.18 | +12.18 | holds |
| 27.5% | 20 | 3.000 | 43.24B/s | 57.01B/s | 46.87B/s | 61.79B/s | 19.50 | 27.18 | +7.68 | holds |
| 48.8% | 17 | 3.529 | 50.88B/s | 67.08B/s | 55.14B/s | 72.69B/s | 22.94 | 27.18 | +4.24 | holds |
| 91% (+120% lands here) | 13 | 4.615 | 66.53B/s | 87.72B/s | 72.10B/s | 95.06B/s | 30.00 | 27.18 | −2.82 | holds for 60s, uptime 1.00. An endless channel runs out |
| 143.5% (above the probable 120% cap, reference only) | 10 | 6.000 | 86.49B/s | 114.03B/s | 93.73B/s | 123.58B/s | 39.00 | 27.18 | −11.82 | reference. The scored build clamps to the probable cap |

Flay bleed DPS is one application's total divided by its duration. Bloodletter's 2-piece multiplies both the total and the duration by 1.8, so the per-second rate is the 621% total divided by 5 seconds. The buff allows 1 stack and does not extend past that duration. No field says whether a new Flay refreshes or snapshots the coefficient. The score assumes one stack stays up while Flay is being cast. That refresh is uncertain.

## Fury per second

Double Swing and Flay use a base of 1 attack per second, an estimate, times `1 + attack speed`. The powers use `Attacks_Per_Second_Total` and the mace item type stores +10% weapon speed, not a base rate. The sheet bonus is not increased by that +10%. At +120% their attack rate is 2.20. Fury regeneration 85/s is the town sheet, because combat regeneration is null. Ramaladni drains 7% of 826 Fury per second on every build. Tuskhelm's 6 Fury/s is not on these lists.

Whirlwind Fury per second is `15 × (ticks per second / ticks per second at 1.0 APS)`. The 1.0 APS reference is `30/13`, the same rate as 26 frames. At the +120% step that ratio is 2, so the cost is 30 Fury/s.

| Build | Actions | Cost | Generation | Net | Holds for 60s |
| --- | --- | ---: | ---: | ---: | --- |
| Whirlwind, breakpoints | 4.615 ticks/s | 30.00 | 27.18 | −2.82 | yes for 60s. The pool lasts 292.9s |
| Whirlwind, flat formulas | 2.308 ticks/s | 15.00 | 27.18 | +12.18 | yes |
| Double Swing | 2.20 casts/s | 44.00 | 60.18 while Lunging Strike fills the rest | −16.82 if only Double Swing is cast | no. Spender uptime 0.78, with Lunging Strike filling the other 0.22 |
| Flay | 2.75 casts/s | 68.75 | 68.43 | −0.32 | the 826 pool covers the 60s window. It does not cover an endless fight |

Double Swing costs 20 Fury per cast (`tInitialCost`). Its cast rate is `Attacks_Per_Second_Total` because the Slice and Dice penalty `SF_23` is 0. Flay generates 15 and, with Shard of Verathiel equipped, spends 25. Its cast rate is `Attacks_Per_Second_Total × 1.25`. Lunging Strike generates 12 per cast at `Attacks_Per_Second_Total × 1.25`.

## Estimated inputs

- Rank 41. Double Swing and Flay are stored at rank 10. The S16 default stays 41 until a rank is passed in.
- Attack speed bonus +120%. Whirlwind reads it as a frame breakpoint. The label is community-measured S15 (3.2), recheck after S16 launch.
- Whirlwind weapon type, default 2H polearm. Polearm-specific frames are an estimate. Ramaladni's Magnum Opus is the one-handed sword.
- Attack speed cap 120%. Label: probable cap, estimate (inferred from the sheet never exceeding 120% in S15); recheck S16. Pass null or Infinity to leave it uncapped. The equipped attack speed affixes add 151.5% past that probable cap: helm 17.5, gloves 34.0, Insight 54.2, Spirit 45.8. Each is worth 0 under the default. Search drops them. Insight already has its x310% Critical Strike Damage Multiplier, and Spirit already has its x66% All Damage Multiplier. Helm and gloves have no stored damage affix to take the slot.
- Polearm Expertise 10/10. PTR rank 10 is 15%[x] while Healthy, and 1.5% Lucky Hit Chance per level (15% at rank 10). Player Healthy uptime is 1. That uptime is an estimate.
- Might's 8%[x] with a Two-Handed weapon is already on the equipped glyph. It is scored once.
- Whirlwind attack-speed model, default `breakpoints`. `flat` keeps the literal formula reading.
- Base attacks per second 1.0.
- Maximum Fury 826 and Ramaladni's 7% drain.
- Town Fury regeneration 85/s.
- One-Handed Mace Expertise level 10 with two maces, on Double Swing only.
- Fists of Fate expected value, on by default.
- Flay bleed refresh. One stack is in the data. Refresh versus snapshot is not.
- Lunging Strike as the sixth Double Swing skill. Unconfirmed.

### Set bonuses in isolation

The piece count for the three set powers is not in the checked-out files. A build that names the set scores all three powers. Each factor is that one line added to the build's other lines, at the max roll, divided by the same score without the set lines.

| Line | Bucket | Value | Peak | Average | Builds |
| --- | --- | ---: | ---: | ---: | --- |
| Sescheron's Fury, Colossal damage | [x] | 600 | ×7.0000 | ×7.0000 | Double Swing, Whirlwind |
| Berserker's Crucible, Berserking damage | [+] | 50 | ×1.0016 | ×1.0021 | Double Swing, Whirlwind |
| Berserker's Crucible, after 5s Berserking | [x] | 200 | ×1.0000 | ×2.2790 / ×2.2633 | Double Swing / Whirlwind |
| Bloodletter's Flow, Bleeding damage | [x] | 200 | ×3.0000 | ×3.0000 | Flay |

Sescheron's first power is 120%[x] while Colossal. The third power replaces that with 600%[x]. They do not stack. The score uses 600%[x]. Uptime is 1 because Fury 826 is above the 100 Fury line. That uptime is an estimate.

The Crucible 10%[x] against Elites after 60 seconds of Berserking is in the file. No slice of this 60s timeline reaches a 60 second Berserking streak, so its contribution is ×1.

### Other scored lines

| Line | Bucket | Min | Max | Where |
| --- | --- | ---: | ---: | --- |
| Ramaladni's Magnum Opus, per Fury | [x] | 0.35 | 0.50 | all three, times Fury 826 |
| Tibault's Will, while Unstoppable | [x] | 15 | 20 | Double Swing, Flay |
| Earthstriker's Overpower | [x] | 15 | 35 | Double Swing |
| Crushing, while Fortified | [x] | 45 | 65 | Double Swing |
| Ring of Red Furor, next Core cast | [x] | 50 | 60 | Double Swing peak only |
| Fists of Fate, expected hit | [x] | ×1.255 | ×1.505 | Double Swing. Estimate. Switchable off. |
| One-Handed Mace Expertise | [x] | 20 | 20 | Double Swing. Level 10 and two maces are estimates. The boss keeps the line on. |
| Polearm Expertise, while Healthy | [x] | 15 | 15 | Whirlwind. Rank 10/10 from the PTR power. Player Healthy uptime is an estimate. |
| Shard of Verathiel, Basic damage | [x] | 70 | 100 | Flay |
| Hooves of the Mountain God, Fury drain | [x] | 45 | 60 | Flay peak only |
| Moonrise, Basic damage in Bloodrage | [x] | 60 | 100 | Flay peak only |

Fists of Fate deals 1% to 250–300% of normal damage. The expected multiplier is (1% + cap) / 2. Turning it off drops the Double Swing max peak from 41.33B to 27.46B.

## Unscored

- Horadric seal affixes. The strings give the bucket (`%x` on Sescheron damage, Crucible elite damage, Bloodletter bleed, rupture, and vulnerable damage). The number is a `GearAffix_*` formula id, and that table is not in the checkout, so the roll stays null.
- Set lines that are not a damage percent: cast speed, size, Fury, life, damage reduction, cooldown reduction, and the shout trigger. Bloodletter's 80%[x] longer duration is applied to the Flay bleed total (×1.8) and is not a separate damage line. That 2-piece also makes bleeding enemies Vulnerable, so the Flay score keeps Vulnerable on.
- The Crucible 10%[x] elite line after 60 seconds of Berserking. Uptime on this timeline is 0.
- Paingorger's Gauntlets. The echo is a separate hit.
- Accursed Touch. It applies Vulnerable and is not a damage percent.
- Disobedience. Damage reduction.
- Ambidextrous. Nikolay's glyphs stay in the sheet.
- War Plans, Marks of Wisdom, Tyrael's Boons, and Greater Temper.
- Flay's 5.5% direct hit. The score is the bleed only.
- Double Swing's second swing. The score is one swing at 150%.
- Ring of Red Furor, Hooves, and Moonrise have no stored uptime. They are on the peak and off the average.
- Legendary-rank tops and the skill rank table are unverified or missing.
- The sheet and the paragon on Nikolay's build are an assumption.
