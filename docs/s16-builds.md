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

## Scores at 0 souls

Healthy Vulnerable boss. Min and max are the parsed PTR rolls. Every figure is an estimate.

| Build | Peak min | Peak max | Average min | Average max |
| --- | ---: | ---: | ---: | ---: |
| Double Swing | 1.52B | 2.98B | 0.48B | 0.88B |
| Whirlwind | 1.79B | 2.36B | 0.86B | 1.13B |
| Flay direct stub | 0.32B | 0.70B | 0.06B | 0.10B |

### Main lines that were scored

| Line | Bucket | Min | Max | Where |
| --- | --- | ---: | ---: | --- |
| Ramaladni's Magnum Opus, per Fury | [x] | 0.35 | 0.50 | all three, times Fury 826 |
| Tibault's Will, while Unstoppable | [x] | 15 | 20 | Double Swing, Flay |
| Earthstriker's Overpower | [x] | 15 | 35 | Double Swing. Rank 1 and rank 21. Unverified. |
| Crushing, while Fortified | [x] | 45 | 65 | Double Swing. Rank 1 and rank 21. Unverified. |
| Ring of Red Furor, next Core cast | [x] | 50 | 60 | Double Swing peak only |
| Shard of Verathiel, Basic damage | [x] | 70 | 100 | Flay |
| Hooves of the Mountain God, Fury drain | [x] | 45 | 60 | Flay peak only |
| Moonrise, Basic damage in Bloodrage | [x] | 60 | 100 | Flay peak only. Rank 1 and rank 21. Unverified. |

Double Swing's hit is 114/386 of the calibrated Whirlwind hit. The stored 114% has no damage type. The PTR note's 150% per swing is not applied.

Whirlwind keeps the 386% coefficient.

Flay's row is the stored 15% direct piece, 15/386 of the Whirlwind hit. The bleed is not in that number.

## Unscored

- Horadric jewelry, Horadric weapon and armor lines, and the two-set bonuses for Sescheron's Fury, Berserker's Crucible, and Bloodletter's Flow. The set pieces are named and not given a damage factor.
- Fists of Fate. The PTR line is a random 1% to 250–300% of normal damage, format a bare `%`.
- Paingorger's Gauntlets. The echo to marked enemies is a separate hit.
- Accursed Touch. It applies Vulnerable. It is not a damage percent. The boss timeline is already Vulnerable during War Cry.
- Disobedience. The line is damage reduction, not damage dealt.
- Ambidextrous. The patch note says 8%[x] to 15%[x]. Nikolay's glyphs stay in the sheet, so that change is not added on top.
- New S16 systems: War Plans, Marks of Wisdom, Tyrael's Boons, Greater Temper. None of them have a damage term in this score.
- Flay bleed. The 45% bleed over 5 seconds in the stored tooltip is not a scored component. Damage over time does not crit. The direct stub still uses the Whirlwind crit model, so it is not the bleed build.
- Crucible and Sescheron's set bonuses and their Horadric seal lines (Elite Damage, Attack Speed, Damage Reduction, Fury, Life, Berserking stats). No set count is stored, so none of those lines are multiplied in.
- Ring of Red Furor, Hooves, and Moonrise have no stored uptime. They are on the peak and off the average.
- Legendary-rank tops for Earthstriker, Crushing, and Moonrise use rank 21 from `arMaxLegendaryRanks`. That scaling is unverified.
- The sheet and the paragon already on Nikolay's build are an assumption. These lists do not include his node ids.
