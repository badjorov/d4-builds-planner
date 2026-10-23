# Whirlwind damage audit

Nikolay's in-game Whirlwind hits, with buffs up, exceed 500B. The model before this pass printed 1.53B–8.31B. That range is the blended expected power across the four `critAudit.reading` values, and it is short of 500B by about 60× at the top and about 326× at the bottom.

This pass checks every factor the equipped Whirlwind calc applies, using only numbers stored in this repo. One stored tooltip was applied once instead of per point of Fury. That line is fixed below. Everything else that could close the rest of the gap is listed as a suspect, with a score, or marked unknown when the repo has no count, uptime, or formula.

The headline number is the uptime blend. The heaviest single state in that blend (Vulnerable on, Overpower off, Unstoppable on, elites on, Healthy-or-Injured on) is 40,328,167,305.91. The expectation is 42,398,366,381.44. A fight with every modeled buff on at once is 98,723,353,564.87. The 500B hits are the all-buffs case, so both figures are compared with 500B.

| Comparison | Headline power | 500B / power |
| --- | ---: | ---: |
| Previous blended headline (Ramaladni applied once) | 8,306,112,712.15 | 60.20× |
| Previous low reading | 1,532,493,120.32 | 326.26× |
| Blended headline after the Fury fix | 42,398,366,381.44 | 11.79× |
| Every modeled uptime set to 1 | 98,723,353,564.87 | 5.06× |

Sources for the formula, with the confidence already recorded in `src/engine.js`:

- [A] d4guides.gg, Chrix1848, 2026-10-05, season 15 / 3.2.2. Medium on the guide. Medium-high that same-type gear multipliers add, and that an aspect, unique, or skill `[x]` crit line multiplies on its own. https://d4guides.gg/en/guides/mechanics/damage-calculation-in-diablo-4-how-your-damage-works
- [B] Blizzard season 2 note, quoted by Mobalytics. High for the quoted baseline. https://mobalytics.gg/diablo-4/guides/damage-buckets-deep-dive
- [C] Wowhead, 2023. High for the quoted baseline. https://www.wowhead.com/diablo-4/news/breaking-down-the-critical-strike-and-vulnerable-damage-change-diablo-4-335487
- [E] diablo4.cc glossary, datamined tooltip strings, version undated. Medium that the sheet crit figure includes the inherent 50%. https://diablo4.cc/us/Glossary
- [F] Blizzard forum, a player reply, not staff, date unknown. Low on whether every equipped weapon's `[x]` crit counts. https://us.forums.blizzard.com/en/d4/t/weapon-stats-and-weapons-used/47095

No other numbers were copied from those pages.

## Ramaladni's Magnum Opus

The tooltip is stored at `data/barbarian.json:6375`: "Skills deal 0.50%[x] [0.35-0.50]% increased damage per point of Fury you have." The effect value is the per-point rate, 0.5, bucket multiplicative, conditions empty, verified. Max Fury on the defence sheet is 826 (`data/builds.json:727`).

The previous calc used 0.5 a single time, factor 1.005. The rate times Max Fury is `1 + 0.005 × 826 = 5.13`, modifier value 413. That is the headline now. Ramaladni reads `currentFury` when that input is a number, and otherwise the resolved Max Fury. With both unset, the rate stays 0.5, so a search that has no Max Fury still uses the per-point rate once.

`currentFury` is empty on the saved build. It defaults to the resolved Max Fury, 826, and that default is flagged as an estimate. The same tooltip drains 7% Fury per second in combat (`data/barbarian.json:6337`), so 5.13× is the full-Max-Fury reading. A measured current Fury below 826 would shrink this factor. The ratio against the old 1.005 line is 5.13 / 1.005 = 5.1045, and the blended headline moves from 8,306,112,712.15 to 42,398,366,381.44 by that exact ratio.

`sheetContext` is `town`, `combat`, `combat-nobuff`, or `combat-allbuff`. The saved build is `town`. The headline in the table below is the town context. `combat-nobuff` and `combat-allbuff` hold a video-model reading from 2026-10-23. That reading is unconfirmed. A missing value falls back to town, and `combat-allbuff` falls back to `combat-nobuff` first. The result lists each fallback. Fury regeneration 85, generation 52.5%, cost reduction -30%, and Fury on kill 11 are stored as town readings. They stay records.

## Factor table

Equipped Whirlwind only. "Effective" is the blended headline power divided by the same power with that one line removed. An always-on `[x]` line's effective factor equals `1 + tooltip/100`. A conditional line is smaller, because the uptime blend turns it off some of the time and because crit is `(A + 74.248) / A`, so a bigger additive A shrinks the crit term. Gear `[x]` crit lines are summed, so each line's effective factor is its marginal inside that sum, and the three of them together are ×5.42.

| Name | Additive or [x] | Tooltip value | Uptime or state weight | Effective multiplier | Source |
| --- | --- | ---: | ---: | ---: | --- |
| Weapon damage | base | 4,596 | 1 | starting term | `data/builds.json:693`, `src/engine.js:37` |
| Whirlwind coefficient | base | 386% | 1 | ×3.86 on weapon damage (base 17,740.56) | `data/barbarian.json:293`, `src/engine.js:37` |
| All Damage | additive | 606.7% | 1 | ×1.0729 | `data/builds.json:706`, `src/engine.js:42` |
| Damage with Physical | additive | 250.5% | 1 | ×1.0289 | `data/builds.json:709`, `src/catalog.js:377` |
| Vulnerable Damage | additive | 208.8% | Vulnerable 0.662691, estimate | ×1.0189 | `data/builds.json:708`, `src/catalog.js:384` |
| vs Elites | additive | 133.5% | elites 0.75, estimate | ×1.0113 | `data/builds.json:716`, `src/catalog.js:387` |
| vs Healthy or Injured | additive | 26% once | Healthy or Injured 0.70, estimate | ×1.0024 | `data/builds.json:717`, `src/catalog.js:390` |
| while you are Healthy | additive | 223.2% | player Healthy 1, estimate | ×1.0256 | `data/builds.json:719`, `src/catalog.js:394` |
| while Fortified | additive | 35% | Fortified 1, confirmed | ×1.0039 | `data/builds.json:720`, `src/catalog.js:396` |
| Leoric's Crown | [x] | 4.1% per soul, applied once | 1 | ×1.0410 | `data/barbarian.json:6467` |
| Gohr's Devastating Grips | [x] | 117% Whirlwind | 1 | ×2.1700 | `data/barbarian.json:6562` |
| Tibault's Will | [x] | 26% while Unstoppable and for 5s after | Unstoppable 0.967138, estimate | ×1.2515 | `data/barbarian.json:6600` |
| Earthstriker's Aspect | [x] | 19.5% while you have Overpower | treated as always on, because Overpower uptime is above 0 | ×1.1950 | `data/barbarian.json:5441`, `src/catalog.js:210` |
| Melted Heart of Selig | [x] | 30% above 50 Fury | Fury above 50 is 1, confirmed | ×1.3000 | `data/barbarian.json:6826` |
| Melted Heart of Selig | vuln [x] | 35% Vulnerable Damage Multiplier | Vulnerable 0.662691, estimate | ×1.2602 | `data/barbarian.json:6841`, `src/engine.js:65` |
| Stone of Jordan | [x] | 23% to the highest element | 1 | ×1.2300 | `data/barbarian.json:6747` |
| Crushing Aspect | [x] | 64% while Fortified | Fortified 1, confirmed | ×1.6400 | `data/barbarian.json:3894` |
| Aspect of Channeling | [x] | 138% while channeling | Channeling 1, estimate, Whirlwind is tagged Channeled | ×2.3800 | `data/barbarian.json:3416` |
| Ramaladni's Magnum Opus | [x] | 0.50% per Fury × Max Fury 826 = 413% | full Max Fury; current Fury is unmeasured | ×5.1300 | `data/barbarian.json:6375`, `data/builds.json:727` |
| Warbringer | [x] | 45% while Fortified | Fortified 1, confirmed | ×1.4500 | `data/barbarian.json:9744` |
| Decimator | [x] | 20% vs Vulnerable | Vulnerable 0.662691, estimate | ×1.1530 | `data/barbarian.json:9902` |
| Decimator | [x] | 20% while having Overpower | Overpower 0.364507, estimate | ×1.1078 | `data/barbarian.json:9914` |
| Weapons Master | [x] | 75% vs Healthy and Injured | Healthy or Injured 0.70, estimate | ×1.5601 | `data/barbarian.json:10063` |
| Might | [x] | 8% with a Two-Handed weapon | 1 (arsenal has a 2H) | ×1.0800 | `data/barbarian.json:10377` |
| Might | [x] | 26% vs Healthy and Injured | Healthy or Injured 0.70, estimate | ×1.2090 | `data/barbarian.json:10388` |
| Twister | [x] | 13% for 4s after creating a Dust Devil | Dust Devil 1, estimate | ×1.1300 | `data/barbarian.json:10429` |
| Imbiber | [x] | 16% while you are Healthy | player Healthy 1, estimate | ×1.1600 | `data/barbarian.json:10503` |
| Imbiber | [x] | 5% per missing potion, 0 of 4 | missing potions 0, estimate | ×1.0000 | `data/barbarian.json:10480`, `src/catalog.js:397` |
| Marshal | [x] | 13.5% | 1 | ×1.1350 | `data/barbarian.json:10648` |
| Insight crit | gear crit [x], summed | 310% | 1 | ×2.3362 inside the ×5.42 sum | `data/barbarian.json:8415` |
| Deathshead crit | gear crit [x], summed | 88% | 1 | ×1.1938 inside the ×5.42 sum | `data/barbarian.json:9106` |
| Ramaladni crit | gear crit [x], summed | 44% | 1 | ×1.0884 inside the ×5.42 sum | `data/barbarian.json:9308` |
| Main stat | separate | 0.8% per 10 Strength, Strength 4,101 | 1 | ×4.2808 | `data/barbarian.json:209`, `data/builds.json:694`, `src/engine.js:49` |
| Crit chance and sheet crit | formula | 100% chance, 7,424.8% damage | chance 1 | modal-state factor ×30.8304; removing crit entirely is ×32.1989 on the blend | `data/builds.json:695`, `src/engine.js:57` |
| Vulnerable base | formula | ×1.2 vs Vulnerable | Vulnerable 0.662691, estimate | on-state ×1.2, times Melted Heart's ×1.35, so the on-state vulnerable factor is ×1.62. Removing the whole Vulnerable state is ×1.6563 on the blend | `src/engine.js:22`, `src/engine.js:65` |
| Overpower bonus | formula | 104% = 4 × 26% | Overpower 0.364507, estimate | on-state ×2.04; the 104 points alone are ×1.4240 on the blend. An independent blend of ×2.04 and ×1 would be ×1.3791 | `data/builds.json:726`, `data/barbarian.json:5467`, `src/engine.js:68` |

The modal-state product of those terms is base × 15.837 × 671.3507 × 4.2808 × 30.8304 × 1.62 × 1 = 40,328,167,305.91. Overpower is off in that state, so its term is 1. The printed power, 42,398,366,381.44, is the expectation across Vulnerable, Overpower, Unstoppable, elites, and Healthy-or-Injured.

All Damage's tooltip contribution to the additive factor is +6.067, and the all-on additive factor is 15.837. Its effective multiplier on the total is only ×1.0729 because the crit term divides by that same additive factor.

## The eight checks

### 1. Ramaladni

Fixed, as above. ×5.13 at Max Fury 826. The old ×1.005 is gone from the headline. This accounts for the move from the 1.53B–8.31B range to 7.82B–42.40B. It leaves an 11.8× gap on the blended headline and a 5.1× gap when every modeled buff is on.

### 2. Overpower

The bonus in the calc is `overpowerPct` 104, which is 4 stacks × 26% from Earthstriker (`data/barbarian.json:5467`). Wrath's "1 Overpower per second" uses that same 26% line, and the per-stack effect is skipped when `overpowerPct` is a number, so it is counted once. On a hit that Overpowers, the factor is `1 + 104/100 = 2.04`. No other overpower-bucket line is added.

The 0.364507 weight is `(15.8 + 4) / 54.32`: Wrath lasts 15.8s on a 54.32s cooldown, and the 4 stacks linger 4s. It is an estimate. The blend puts weight 0.364507 on the ×2.04 state and weight 0.635493 on ×1, together with the other uptimes, so the lines are correlated. Decimator's 20%[x] while having Overpower uses that same state. Earthstriker's 19.5%[x] does not: its condition is "while you have Overpower", and the scorer turns a state fully on whenever its uptime is above 0 unless the effect sets `alignWithState`. The 19.5% is therefore on every hit. Aligning it with the Overpower state changes the blended headline from 42,398,366,381.44 to 35,479,804,503.29 (×0.8368). That moves the score down, so it widens the gap.

Life and Fortify are stored (Life 473, Warbringer grants 2% of Maximum Life as Fortify, shown as 9). The repo has no life-plus-Fortify Overpower formula, so that scaling is unknown and has no score.

### 3. Berserking

Berserking is absent from the calc. `uptime.berserk` is null, and the stored uptime note says Berserk uptime is not estimated. War Cry's tooltip says "Berserking 75%[x] damage, 15%[x] Movement Speed" (`data/barbarian.json:1495`). Those keyword lines are not copied onto a damage effect. Wrath's tooltip says "Berserking base doubled" (`data/barbarian.json:1937`). If 75%[x] is the base, the doubled reading is 150%[x]. That reading is an interpretation of the keyword text. No uptime is stored, so both are ceilings at uptime 1: ×1.75 and ×2.50. They are not part of the defined total.

### 4. Twister and Dust Devils

Twister's scored line is one buff, +13%[x] for 4s after creating a Dust Devil, at Dust Devil uptime 1. It is not per stack, and nothing in the repo says stacks of that buff multiply.

Whirlwind's tooltip and the allocated Tornado upgrade say 2 Dust Devils at 510% each (`data/barbarian.json:311`). Those hits sit outside the 386% coefficient. The tooltip does not say whether a Dust Devil is a direct hit or damage over time, so the damage type stays unset. No Dust Devil hit rate is stored, so they are not added. Twister's legendary Dust Devil damage +39.9%[x] and the +39.8% per 5 Strength line are `scored: false` for the same reason. The "110/+40 Strength" count is tooltip text, not board data. Weapon attacks per second (0.90 on Deathshead) are stored and are not a Dust Devil hit rate.

If the two 510% devils hit once for each 386% Whirlwind hit, on the same weapon-damage base, the hit total would be `(386 + 2 × 510) / 386 = 3.642×`. That hit rate is not stored, so this has no score. The 39.9%[x] would apply to the devil portion only.

### 5. Warbringer, stacking lines, and seasonal buffs

Warbringer's legendary 45%[x] while Fortified is in the table at ×1.45. The 2% Maximum Life Fortify grant is defense and is skipped. The other Warbringer nodes have null buckets: Raw Power Damage 20 and Dust Devil 39.5, Brute Force damage while Fortified 20 and Dust Devil 19.5 (`data/barbarian.json:9761`, `data/barbarian.json:9800`). All Damage 606.7% already includes the tooltip split +316.5% from items and Paragon, so those untagged node percents are not added on top.

Stacking lines that are equipped:

- Leoric's Crown is 4.1%[x] per soul, stacking text "up to 200 stacks" (`data/barbarian.json:6467`). The soul count is not in the screenshot, so the rate is applied once (×1.041). The cap, if it were full, is `1 + 4.1 × 200 / 100 = 9.2`, which is ×8.8377 against the current ×1.041. The count is unknown. The gem's +65%[x] on Leoric is utility and is skipped.
- Aspect of Channeling 138%[x] is in the calc. Whirlwind's own channel bonus is 1%[x] per hit, cap 25 (`data/barbarian.json:366`). The uptime note says those stacks are reached fast and are not added on top of the 138%. If both apply, the cap is another ×1.25.
- Earthstriker's Overpower stacks are the 104% above, not a second stacking `[x]`.
- Twister is one 4s buff, covered above. Imbiber's per-potion line is ×1.000 at 0 missing potions.

Seasonal data: Hell's Legacy has an empty effect list ("No mechanic numbers are stored"). Ghosts of Odium stores physical damage 56,847 with a null bucket, unverified (`data/barbarian.json:11225`). Undying Rage has a null value. The build's talismans are name strings, and the scorer does not read `build.talismans`. No seasonal multiplier is stored.

Cross-skill buffs the whirlwind-only score leaves out, with a stored duration and cooldown:

- War Cry 38.5%[x] for 4s on a 15.09s cooldown (`data/barbarian.json:1478`). Uptime 4/15.09 = 0.265076. Expected factor ×1.1021.
- Wrath of the Berserker 30%[x] for 15.8s on a 54.32s cooldown (`data/barbarian.json:1884`). Uptime 15.8/54.32 = 0.290869. Expected factor ×1.0873.

Challenging Shout's 20%[x] on the first 5 taunted has no duration stored (`data/barbarian.json:1382`), and its 20%[x] vs Burning has no Burning uptime. Both stay unscored.

### 6. Vulnerable `[x]` beyond Melted Heart

The only scored Vulnerable Damage Multiplier is Melted Heart's 35%, inside `1.2 × 1.35`. Decimator's 20%[x] vs Vulnerable is general damage versus Vulnerable, already in the `[x]` product, and it is a different stat from Vulnerable Damage Multiplier. Sheet Vulnerable Damage 208.8% stays additive on that state.

Two Greater Affix lines, `v1-selig-vuln-mult` and `v1-crush-vuln-mult`, are +10% "Vulnerable Damage Multiplier" with a null bucket, from the video, unverified (`data/barbarian.json:8795`, `data/barbarian.json:9215`). Treating both as vuln `[x]` summed with the 35% is a suspect, ×1.1180 on the blend. The ring also has +16% Vulnerable Damage with a null bucket (`data/barbarian.json:9239`). That looks like an additive vulnerable line and may already sit inside sheet 208.8%. It is not added again.

### 7. Crit `[x]` lines: sum and product

Headline sums the three gear lines: `1 + (310 + 88 + 44) / 100 = 5.42`. There is no separate aspect, unique, or skill `[x]` crit line on the headline. The modal-state crit factor is `(15.837 + 74.248) / 15.837 × 5.42 = 30.8304`.

The product of the same three lines is `4.10 × 1.88 × 1.44 = 11.09952`, which is ×2.0479 against the sum. On `active-weapon` only Deathshead's 88% remains, so the product equals the sum. On `sheet-includes-gear-x` the gear lines are omitted, so the product equals that reading too.

Flawless Technique's +45%[x] Critical Strike Damage is an alternate reading (`data/barbarian.json:9478`). Consecutive-weapon uptime is 1, an estimate, and the line multiplies on its own (×1.45). The headline leaves it out. The patch-note 45%[x] is generic damage with null conditions and stays out as well.

Wrath glyph +17.8%[x] Critical Strike Damage is kept inside sheet 7,424.8% (`data/barbarian.json:10585`).

Damage over time does not crit. The crit factor on a damage-over-time part is 1, and crit-damage [x] lines are left off that part. Challenging Shout's 2,430% burn and Wrath of the Berserker's 56% burn were already on that factor, and they stay there. Whirlwind's scored 386% hit is direct, so the blended headline stays 42,398,366,381.44. The 510% Dust Devils have no stored damage type. They stay outside the coefficient and are flagged.

### 8. Sheet lines dropped or double-counted

The offensive sheet is screenshot-verified and `additiveAudit.verified` is true. Every conditional row in the sheet is in the table. Other elements (Fire 120.5, Lightning 90.5, Cold 134.3, Holy, Poison, and Shadow 90.5) stay off a Physical skill. Thorns is 0.

Counted on both sides, on purpose:

- Sheet vs Healthy 26 and vs Injured 26 match Might's 26%[x]. The numbers match, so this one is ambiguous. The headline keeps the additive 26 and the `[x]` 26.
- Vulnerable Damage 208.8% is additive. Melted Heart's 35% is a Vulnerable Damage Multiplier. Both are counted.
- while Fortified 35% does not match Warbringer 45%[x] or Crushing 64%[x]. The additive 35 and both `[x]` lines are counted.
- Imbiber's 16%[x] while Healthy and the sheet's 223.2% while Healthy are different numbers. Both are counted.

Left out of the product, with a stored value:

- Whirlwind's allocated Cost Damage Bonus is +40%[x] at +10 Fury cost (`data/barbarian.json:334`). The scorer reads the skill coefficient and skill effects. It does not read upgrade modifier values, so this 40% is absent. If the allocated upgrade is part of every Whirlwind hit, the factor is ×1.40.
- Grand Skull sockets are stored on the gear and are not read. Insight has two sockets at 28%[x], Deathshead has two at 28%[x], Spirit has one at 24%[x], and Ramaladni has one at 24%[x] (`data/builds.json:349`). The gem tooltip is 24%[x] (`data/barbarian.json:11376`). The 2H item notes say the socket display is 28% and the gem tooltip is 24%. Whether the sockets add or multiply, and whether only the swinging weapon counts, is unknown. The stored socket values give: Deathshead sum ×1.56, Deathshead product ×1.6384, all six summed ×2.60, all six multiplied ×4.1275.
- Deathshead x25% All Damage Multiplier and Spirit x66% All Damage Multiplier have null conditions (`data/barbarian.json:9086`, `data/barbarian.json:8534`). A null condition stays unknown, so both are left out. The screenshot notes do not state a condition. If they are unconditional, the factor is ×1.25 × ×1.66 = ×2.075.
- The codex Channeling 69%[x] is `scored: false` and is not applied with the 138% imprint.

## Suspects

Ranked by the multiplier each would add on the blended headline. "Defined" means the repo stores both the rate and the uptime or count. A ceiling uses a stored cap or a keyword at uptime 1 and is labeled unknown. Unknown rows have no score.

| Rank | Suspect | Plausible multiplier | Blended headline | 500B / that score | Status |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Leoric at the stored cap of 200 souls | ×8.8377 vs the current ×1.041 | 374,702,181,276.85 | 1.33× | Ceiling. Soul count is unknown. All-buffs-on with the cap is 872,483,047,835.56, which is above 500B. |
| 2 | Ramaladni per Fury at Max Fury 826 | ×5.1045 vs the old ×1.005, absolute ×5.13 | 42,398,366,381.44 | 11.79× | Fixed in this pass. Already in every row below. |
| 3 | All six Grand Skull sockets multiplied | ×4.1275 | 174,997,712,728.62 | 2.86× | Stored socket values. Sum-versus-product and which weapons count are unknown. |
| 4 | Dust Devils, two hits at 510% per Whirlwind hit | ×3.642 on the coefficient | no score | — | Hit rate is unknown. |
| 5 | Berserking keyword doubled, uptime 1 | ×2.50 | 105,995,915,953.59 | 4.72× | Ceiling. Uptime is null on purpose. |
| 6 | Deathshead x25% and Spirit x66% if unconditional | ×2.0750 | 87,976,610,241.48 | 5.68× | Conditions are null. |
| 7 | Gear crit lines multiplied instead of summed | ×2.0479 | 86,826,847,900.01 | 5.76× | Alternate. The research sum stays the headline. Active-weapon and sheet-includes readings do not change. |
| 8 | Berserking keyword 75%[x], uptime 1 | ×1.75 | 74,197,141,167.51 | 6.74× | Ceiling. Uptime is null on purpose. |
| 9 | Deathshead's two Grand Skull sockets summed | ×1.5600 | 66,141,451,555.04 | 7.56× | Swinging-weapon reading of the stored 28% sockets. The product of those two is ×1.6384 and 69,465,483,479.34. |
| 10 | War Cry 38.5%, Wrath 30%, and the channel cap of 25, at their stored weights | ×1.4978 | 63,503,231,702.76 | 7.87× | Defined. War Cry alone ×1.1021, Wrath alone ×1.0873, channel cap alone ×1.2500. |
| 11 | Flawless Technique +45%[x] crit, separate | ×1.4500 | 61,477,631,253.08 | 8.13× | Alternate. Consecutive-weapon uptime 1 is an estimate. |
| 12 | Whirlwind Cost Damage Bonus | ×1.4000 | 59,357,712,934.01 | 8.42× | Allocated upgrade, screenshot 40%[x]. Absent from the scorer. |
| 13 | The two +10% Vulnerable Damage Multiplier affixes | ×1.1180 | 47,400,402,463.24 | 10.55× | Null bucket, video, unverified. |
| — | Overpower from Life and Fortify | unknown | no score | — | No formula is stored. The 104% line is already applied. |
| — | Ghosts of Odium 56,847 | unknown | no score | — | Null bucket. The unit is not stored. |
| — | Current Fury below Max Fury | shrinks Ramaladni | no score | — | 7% per second drain is stored. Current Fury is not. |

The defined set at the stored uptimes (Ramaladni already fixed, plus War Cry, Wrath, and the channel cap) is 63,503,231,702.76 blended, still 7.87× under 500B. Forcing those buffs and the other modeled uptimes on raises the headline to 222,189,247,616.94, which is 2.25× under 500B. Adding the crit-product alternate on that all-on state reaches 455,017,342,750.77, which is 1.10× under 500B. One further stored line of about ×1.10 or more (the allocated 40%[x], Deathshead's skull sockets, or a partial Berserking uptime) would pass 500B on that stack. Each of those is still an assumption, and the crit product is the less likely reading of the research note.

No single stored line with a known count, other than the Ramaladni fix, closes a 500B hit on the headline. The Leoric cap does, and only by using a soul count that was not on the screenshot.

## Scores under each crit reading

`sheet-includes-gear-x-active-weapon` matches `sheet-includes-gear-x` on this build, because both leave every gear crit line out. Powers are the blended expectation unless the row says all-on.

| Case | headline | sheet-includes-gear-x | active-weapon | sheet-includes-gear-x-active-weapon |
| --- | ---: | ---: | ---: | ---: |
| Baseline, Ramaladni fixed | 42,398,366,381.44 | 7,822,576,823.14 | 14,706,444,427.51 | 7,822,576,823.14 |
| Previous single 0.5% | 8,306,112,712.15 | 1,532,493,120.32 | 2,881,087,066.21 | 1,532,493,120.32 |
| Baseline, every modeled uptime at 1 | 98,723,353,564.87 | 18,214,640,879.13 | 34,243,524,852.76 | 18,214,640,879.13 |
| War Cry 38.5% at 4/15.09 | 46,725,303,705.98 | 8,620,904,742.80 | 16,207,300,916.47 | 8,620,904,742.80 |
| Wrath 30% at 15.8/54.32 | 46,098,076,555.37 | 8,505,180,176.27 | 15,989,738,731.38 | 8,505,180,176.27 |
| Channel cap 25% | 52,997,957,976.79 | 9,778,221,028.93 | 18,383,055,534.39 | 9,778,221,028.93 |
| Vulnerable GA +10 and +10 | 47,400,402,463.24 | 8,745,461,709.08 | 16,441,468,013.08 | 8,745,461,709.08 |
| Gear crit as a product | 86,826,847,900.01 | 7,822,576,823.14 | 14,706,444,427.51 | 7,822,576,823.14 |
| Berserking 75%, uptime 1, ceiling | 74,197,141,167.51 | 13,689,509,440.50 | 25,736,277,748.14 | 13,689,509,440.50 |
| Berserking 150%, uptime 1, ceiling | 105,995,915,953.59 | 19,556,442,057.86 | 36,766,111,068.77 | 19,556,442,057.86 |
| Leoric 200 souls, ceiling | 374,702,181,276.85 | 69,133,243,778.02 | 129,970,498,302.67 | 69,133,243,778.02 |
| Whirlwind cost bonus 40% | 59,357,712,934.01 | 10,951,607,552.40 | 20,589,022,198.51 | 10,951,607,552.40 |
| Deathshead skulls summed (56%) | 66,141,451,555.04 | 12,203,219,844.10 | 22,942,053,306.91 | 12,203,219,844.10 |
| Deathshead skulls multiplied | 69,465,483,479.34 | 12,816,509,867.04 | 24,095,038,550.03 | 12,816,509,867.04 |
| All weapon skulls summed (160%) | 110,235,752,591.73 | 20,338,699,740.17 | 38,236,755,511.52 | 20,338,699,740.17 |
| All weapon skulls multiplied | 174,997,712,728.62 | 32,287,400,872.44 | 60,700,313,640.19 | 32,287,400,872.44 |
| x25% and x66% All Damage if unconditional | 87,976,610,241.48 | 16,231,846,908.02 | 30,515,872,187.08 | 16,231,846,908.02 |
| Flawless +45%[x] crit | 61,477,631,253.08 | 11,342,736,393.56 | 21,324,344,419.89 | 11,342,736,393.56 |
| Defined together: War Cry, Wrath, channel cap | 63,503,231,702.76 | 11,716,463,413.79 | 22,026,951,217.93 | 11,716,463,413.79 |
| Defined together, gear crit as a product | 130,047,119,990.68 | 11,716,463,413.79 | 22,026,951,217.93 | 11,716,463,413.79 |
| Defined together plus the Vulnerable GAs | 70,995,158,477.27 | 13,098,737,726.43 | 24,625,626,925.69 | 13,098,737,726.43 |
| Defined together plus the 40% cost bonus | 88,904,524,383.87 | 16,403,048,779.31 | 30,837,731,705.11 | 16,403,048,779.31 |
| Defined together, all of those buffs forced on | 222,189,247,616.94 | 40,994,326,128.59 | 77,069,333,121.74 | 40,994,326,128.59 |
| That all-on row, gear crit as a product | 455,017,342,750.77 | 40,994,326,128.59 | 77,069,333,121.74 | 40,994,326,128.59 |
| Leoric 200, every modeled uptime at 1 | 872,483,047,835.56 | 160,974,732,072.98 | 302,632,496,297.20 | 160,974,732,072.98 |

The flagged range on the fixed baseline is 7,822,576,823.14 to 42,398,366,381.44. Headline is the top of that range.

## Combat sheet, video-model reading 2026-10-23

The numbers above stay the town sheet. This section is a separate per-hit comparison. `combat-nobuff` and `combat-allbuff` are a video-model reading from 2026-10-23. That reading is unconfirmed. The saved `sheetContext` stays `town`, so the blended headline stays 42,398,366,381.44.

The video shows fighting with Fortified and Flawless Technique stacks, then the same fight with War Cry, Rallying Cry, Challenging Shout, Berserking, Wrath of the Berserker, Dust Devil, and one fast-stacking buff. Attack speed 120%, crit chance 100%, crit damage 10,819.5%, Vulnerable Damage 2,836.8%, and Physical 250.5% are the same in both contexts. All Damage is 1,755.2% with no buffs, then ramps from 1,996% to 9,897.7% over about 14 seconds with the buffs up. The lower all-buff rows were not visible, so they use the no-buff values and the result lists that fallback. vs Healthy 181.8% and vs Injured 133.4% are separate rows. while Berserking 247.9% and Overpower Damage 6,432.2% are new rows. Current Fury is 826 because the Fury globe stays full, so the combat contexts are observed and the estimate flag is off there. The town context still estimates.

Each row below is one Whirlwind crit. Channeling, Fortified, Fury above 50, Unstoppable, player Healthy, elites, and consecutive-weapon are on. Missing potions are 0. The mid-life band leaves the Healthy-or-Injured window off, and leaves enemy Healthy and enemy Injured off, so vs Healthy, vs Injured, Weapons Master, and Might's 26%[x] stay off. No-buff leaves Vulnerable, Berserking, and Dust Devil off. All-buff turns those three on. A normal crit leaves Overpower off, so Earthstriker and Decimator's Overpower line stay off. An Overpower crit turns them on and uses Overpower Damage as `1 + 6432.2/100 = 65.322`. Powers are billions, two decimals. The exact totals are locked in `test/combat-sheet.test.js`. `sheet-includes-gear-x-active-weapon` matches `sheet-includes-gear-x` because Deathshead's x88% is a gear line.

| Hit | headline | sheet-includes-gear-x | active-weapon | sheet-includes-gear-x-active-weapon |
| --- | ---: | ---: | ---: | ---: |
| No buff, normal crit | 10.59B | 1.95B | 3.67B | 1.95B |
| No buff, Overpower crit | 992.15B | 183.05B | 344.14B | 183.05B |
| All buff, All Damage 1,996%, normal crit | 28.92B | 5.34B | 10.03B | 5.34B |
| All buff, All Damage 1,996%, Overpower crit | 2,708.70B | 499.76B | 939.55B | 499.76B |
| All buff, All Damage 9,897.7%, normal crit | 42.34B | 7.81B | 14.69B | 7.81B |
| All buff, All Damage 9,897.7%, Overpower crit | 3,966.20B | 731.77B | 1,375.73B | 731.77B |

A second state puts the enemy in the Healthy band and turns Vulnerable on, including for the no-buff hit. That adds vs Healthy 181.8%, Weapons Master 75%[x], and Might 26%[x]. Headline on that state: no-buff normal 55.41B, all-buff low normal 64.44B, all-buff high normal 94.04B, all-buff high Overpower 8,809.26B.

Observed hits from the same video: no buffs typically 20–80B, max about 140–144B. All buffs typically 150–400B, peaks 461B and 507B, and 841B on an Overpower crit.

| Case | Predicted | Observed | Where it sits |
| --- | ---: | --- | --- |
| No buff, mid-life, headline normal | 10.59B | 20–80B, max 140–144B | under the typical floor |
| No buff, Healthy and Vulnerable, headline normal | 55.41B | 20–80B, max 140–144B | inside the typical band, about 2.6× under the max |
| All buff high, mid-life, headline normal | 42.34B | 150–400B | under the typical floor |
| All buff high, Healthy and Vulnerable, headline normal | 94.04B | 150–400B, peaks 461B and 507B | about 1.6× under the typical floor, about 5× under the peaks |
| All buff high, mid-life, headline Overpower | 3,966.20B | 841B | about 4.7× over |
| All buff high, Healthy, headline Overpower | 8,809.26B | 841B | about 10× over |
| All buff high, mid-life, sheet-includes-gear-x Overpower | 731.77B | 841B | near 841B, while that reading's normal hit is 7.81B |
| All buff high, Healthy, Overpower at the town 104% | 275.11B | 150–400B, peaks 461B and 507B, Overpower 841B | inside the typical band, under the peaks and under 841B |

Headline, which keeps the gear crit sum ×5.42, is the reading that lands nearest the observed normal hits. `sheet-includes-gear-x` on a Healthy Vulnerable no-buff hit is 10.22B, under the 20B floor, and on the all-buff high Healthy hit is 17.35B, under the 150B floor. `active-weapon` sits between those and the headline, and is still short of the observed bands.

The town-to-combat jumps were checked as possible double counts.

Critical Strike Damage 7,424.8% to 10,819.5% is ×1.457. `7424.8 × 1.45 = 10,765.96`, and the remainder is about 53.5 points. That jump looks like Flawless Technique's ~45%[x] landing inside the sheet. Headline already leaves that separate ×1.45 off the factor. Adding it again on top of 10,819.5% would count it twice. The jump is much smaller than the gear crit sum ×5.42, so Insight, Deathshead, and Ramaladni stay outside the sheet crit row.

Vulnerable Damage 208.8% to 2,836.8% is ×13.59. Melted Heart's Vulnerable line is ×1.35, and the on-state vulnerable factor is ×1.62. The combat row stays additive, and ×1.62 still applies on a Vulnerable target. Taking ×1.62 off makes the normal hits smaller and moves them away from the video. The jump is extra additive.

All Damage 606.7% to 1,755.2% is ×2.89, and the ramp then reaches 9,897.7%. The multiplicative product on the no-buff mid-life hit is ×187.89, and on the all-buff high Overpower hit it is ×365.36. Dropping the multiplicative bucket on that Overpower hit, with gear crit and the vulnerable factor kept, leaves 10.86B. Also dropping the Vulnerable [x] sum leaves 8.04B. Using `sheet-includes-gear-x` on top of that leaves 1.48B. Those are far under the video, so the [x] product is still required on top of the sheet row.

Overpower Damage 6,432.2% is applied as ×65.322 on an Overpower hit, as the video row reads. The observed Overpower crit, 841B, is about 1.7× to 5.6× the all-buff peaks, which is a much smaller step than ×65. Replacing that row with the town 104% (×2.04) on the all-buff high Healthy Overpower hit gives 275.11B. That sits inside 150–400B and under both the peaks and 841B. The stored combat percent stays the factor the combat context uses. The town context still uses 104%.

What still does not line up, and what was left unchanged:

- Headline normal hits are short of the all-buff band even on a Healthy Vulnerable target (94.04B against 150–400B, and against peaks of 461B and 507B).
- The Overpower sheet percent overshoots 841B on every reading that keeps a normal hit inside or near the no-buff band.
- Dust Devils stay unscored. The tooltip says two at 510% each, and the damage type is unset. If both landed on the same hit as the 386% Whirlwind, the coefficient ratio would be `(386 + 1020) / 386 = 3.642`, and 94.04B would become about 342B, inside 150–400B. The hit rate is unknown, so that ratio is not applied.
- The Leoric skull icon shows no stack count. The rate stays ×1.041, applied once. A 200-soul reading would be about ×8.84 relative to that, and 94B × 8.84 is about 831B, near the 841B Overpower crit. The icon did not show a count, so that cap is not applied.
- The "Deathhead of Channeling" tooltip lines (+21 Damage Multiplier, 150%[x] all damage, +114% damage) do not match Deathshead of Channeling. They are not applied.
- Attack speed 120% is stored and does not change per-hit damage.
- Polearm Expertise is already rank 10/10. The video reads the same rank. Its Lucky Hit and while-Healthy lines stay unscored.
- The Grand Skull sockets on the weapons stay unscored.
