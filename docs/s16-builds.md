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

## Scores at 0 souls

Healthy Vulnerable boss. Min and max are the parsed PTR rolls. Every figure is an estimate. Flay is the bleed: no crit, and Overpower is off because the bleed dot has no overpower term.

| Build | Peak min | Peak max | Average min | Average max |
| --- | ---: | ---: | ---: | ---: |
| Double Swing | 227.83B | 535.57B | 164.08B | 360.80B |
| Whirlwind | 12.53B | 16.53B | 13.58B | 17.91B |
| Flay bleed | 23.11B | 51.60B | 3.42B | 5.52B |

Whirlwind's average is above its peak because the Crucible 200%[x] starts after 5 seconds of Berserking. The full-overlap peak is the first 4 seconds of War Cry, so that line is off the peak and on for part of the average.

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
