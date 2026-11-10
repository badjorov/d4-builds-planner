# Season 16 Barbarian builds (provisional)

Season 16, patch 3.3.0 PTR build 3.3.0.74145. Every row is `provisional: true`. These are short name lists from the user's research notes. Guide text is not copied.

Soul Splinters are gone on the PTR, so these builds have **no soul stacks**. The Season 15 calibration stays stored. Souls on this score are 0. There is no further splinter or charm check.

The score uses the calibrated defaults: Overpower `total`, headline crit, and damage over time does not crit. The combat sheet, paragon nodes, and glyphs stay Nikolay's. His weapon affix [x] crit lines are not in these lists, so they are left off. Combat Fury 826 is his observed reading and is an estimate here. A Healthy Vulnerable boss is the peak (all-buff high, elite, overpower, berserk, unstoppable). The average is the 60s timeline.

## Placeholder

**Double Swing** is waiting for Nikolay's own setup. Until that list arrives, the row uses the research-note list. The placeholder is marked `waiting` on `s16-double-swing`.

## Double Swing

Skills: Double Swing, War Cry, Rallying Cry, Challenging Shout, Wrath of the Berserker. The note also names Leap or Lunging Strike and does not pick one.

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

Links: https://d4guides.gg/en/news/season-16-tier-list-after-the-ptr-who-clears-tower-150 and https://www.wowhead.com/diablo-4/guide/classes/barbarian/flay-build-overview

## Names against the PTR catalog

Resolved ids are in `data/s16-builds.json`. Berserker's Crucible and Bloodletter's Flow match the set tags. The charm items are named "of the Crucible" and "of the Bloodletter".

Unresolved:

- **1H Mace Expertise.** No Item, Affix, or Power record with that name is in the PTR checkout. The patch notes name it as expertise.
- **Double Swing's sixth skill.** Leap and Lunging Strike both resolve. The note does not choose one, so neither is scored.

Flay's skill-kit unlock is `Barb_Unlock_Flay`. There is no `Power_Barbarian_Flay` file in the checkout.

## Coefficients

The rank table `Table(34, sLevel)` is not in the checkout. The score uses the constant in the PTR formula, which is the value at a table of 1.

| Skill | Stored | PTR | Formula |
| --- | ---: | ---: | --- |
| Double Swing | 114% | 150% per swing | `SF_0 = 1.5 * Table(34, sLevel)`. SF_1 is 1.5. One swing is scored. |
| Whirlwind | 386% | 165% | `SF_0 = 1.65 * Table(34, sLevel)`. |
| Flay bleed | 45% over 5s | 115% over 5s | Power `Barbarian_Maim` is named Flay. Bleed total `SF_5 = 1.15 * Table(34, sLevel)`. Duration `SF_7` is 5. Direct hit `SF_1` is 5.5% and is not added. |

## Scores at 0 souls

Healthy Vulnerable boss. Min and max are the parsed PTR rolls. Every figure is an estimate. Flay is the bleed: no crit, and Overpower is off because the bleed dot has no overpower term.

| Build | Peak min | Peak max | Average min | Average max |
| --- | ---: | ---: | ---: | ---: |
| Double Swing | 17.58B | 41.33B | 12.66B | 27.84B |
| Whirlwind | 5.36B | 7.06B | 5.81B | 7.65B |
| Flay bleed | 2.38B | 5.31B | 0.25B | 0.41B |

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
| Shard of Verathiel, Basic damage | [x] | 70 | 100 | Flay |
| Hooves of the Mountain God, Fury drain | [x] | 45 | 60 | Flay peak only |
| Moonrise, Basic damage in Bloodrage | [x] | 60 | 100 | Flay peak only |

Fists of Fate deals 1% to 250–300% of normal damage. The expected multiplier is (1% + cap) / 2. Turning it off drops the Double Swing max peak from 41.33B to 27.46B.

## Unscored

- Horadric seal affixes. The strings give the bucket (`%x` on Sescheron damage, Crucible elite damage, Bloodletter bleed, rupture, and vulnerable damage). The number is a `GearAffix_*` formula id, and that table is not in the checkout, so the roll stays null.
- Set lines that are not a damage percent: cast speed, size, Fury, life, damage reduction, cooldown reduction, the shout trigger, and Bloodletter's 80%[x] longer bleed duration. The duration stays 5 seconds in the damage score.
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
