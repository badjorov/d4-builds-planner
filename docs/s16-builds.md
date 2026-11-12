# Season 16 Barbarian builds (provisional)

Season 16, patch 3.3.0 PTR build 3.3.0.74145. Every row is `provisional: true`. These are short name lists from the user's research notes. Guide text is not copied.

Soul Splinters are gone on the PTR, so these builds have **no soul stacks**. The Season 15 calibration stays stored. Souls on this score are 0. There is no further splinter or charm check.

The score uses the calibrated defaults: Overpower `total`, headline crit, and damage over time does not crit. The combat sheet, paragon nodes, and glyphs stay Nikolay's. His weapon affix [x] crit lines are not in these lists, so they are left off. Combat Fury 826 is his observed reading and is an estimate here. A Healthy Vulnerable boss is the peak (all-buff high, elite, overpower, berserk, unstoppable). The average is the 60s timeline.

## Placeholder

**Double Swing** is waiting for Nikolay's own setup. Until that list arrives, the row uses the research-note list. The placeholder is marked `waiting` on `s16-double-swing`.

## Double Swing

Skills: Double Swing, War Cry, Rallying Cry, Challenging Shout, Wrath of the Berserker, Iron Skin. The 10 Nov 2026 screenshots replace the earlier placeholder list. The sixth slot is Iron Skin. There is no Basic skill.

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

The sixth Double Swing skill is Iron Skin. The earlier placeholder used Lunging Strike. No name in these three lists is left unresolved.

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

`attackSpeedCap` defaults to 120%. The label is evidence, not confirmed. The 10 Nov 2026 sheet reads 120.0% in town and in combat while the gear lines add to about 147.5%. Pass null or Infinity for an uncapped run. With the default, effective attack speed is clamped to 120% for Whirlwind breakpoints, Double Swing and Flay cast rates, and Lucky Hit or on-hit scaling. The 143.5% breakpoint is above that reading. Its row stays in the table as a reference and is left out of the scored build.

`whirlwindAttackSpeedModel: 'flat'` keeps the literal formula reading. In that reading the tick rate and the per-tick damage move together, so damage per second stays at the 1.0 APS rate of `30/13` ticks.

| Build | Peak min | Peak max | Average min | Average max |
| --- | ---: | ---: | ---: | ---: |
| Double Swing, his 10 Nov setup | 384.94B/s | 524.92B/s | 187.22B/s | 255.30B/s |
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
| 143.5% (above the 120% reading, reference only) | 10 | 6.000 | 86.49B/s | 114.03B/s | 93.73B/s | 123.58B/s | 39.00 | 27.18 | −11.82 | reference. The scored build clamps to 120% |

Flay bleed DPS is one application's total divided by its duration. Bloodletter's 2-piece multiplies both the total and the duration by 1.8, so the per-second rate is the 621% total divided by 5 seconds. The buff allows 1 stack and does not extend past that duration. No field says whether a new Flay refreshes or snapshots the coefficient. The score assumes one stack stays up while Flay is being cast. That refresh is uncertain.

## Fury per second

Double Swing and Flay use a base of 1 attack per second, an estimate, times `1 + attack speed`. The powers use `Attacks_Per_Second_Total` and the mace item type stores +10% weapon speed, not a base rate. The sheet bonus is not increased by that +10%. At +120% their attack rate is 2.20. Fury regeneration 85/s is the town sheet, because combat regeneration is null. Ramaladni drains 7% of 826 Fury per second on every build. Tuskhelm's 6 Fury/s is not on these lists.

Whirlwind Fury per second is `15 × (ticks per second / ticks per second at 1.0 APS)`. The 1.0 APS reference is `30/13`, the same rate as 26 frames. At the +120% step that ratio is 2, so the cost is 30 Fury/s.

| Build | Actions | Cost | Generation | Net | Holds for 60s |
| --- | --- | ---: | ---: | ---: | --- |
| Whirlwind, breakpoints | 4.615 ticks/s | 30.00 | 27.18 | −2.82 | yes for 60s. The pool lasts 292.9s |
| Whirlwind, flat formulas | 2.308 ticks/s | 15.00 | 27.18 | +12.18 | yes |
| Double Swing | 2.42 casts/s | 62.92 | 22.11 from regen 80 minus the 7% drain | −40.81 before crit Fury and Unstoppable regen | the dummy stayed full, so uptime is 1. With 3 Fury per crit and Tibault's 25, the model is +1.61 |
| Flay | 2.75 casts/s | 68.75 | 68.43 | −0.32 | the 826 pool covers the 60s window. It does not cover an endless fight |

Double Swing's tooltip cost is 26 Fury. That is the file cost of 20 times Stone of Jordan's +30% resource cost. The swords say 1.10 attacks per second, and the sheet attack speed is 120%, so the cast rate is 2.42. Flay generates 15 and, with Shard of Verathiel equipped, spends 25. Its cast rate is `Attacks_Per_Second_Total × 1.25`.

## Estimated inputs

- Whirlwind and Flay stay at rank 41. Double Swing is rank 48 from the 10 Nov 2026 tooltip.
- Attack speed bonus +120%. Whirlwind reads it as a frame breakpoint. The label is community-measured S15 (3.2), recheck after S16 launch.
- Whirlwind weapon type, default 2H polearm. Polearm-specific frames are an estimate. Ramaladni's Magnum Opus is the one-handed sword.
- Attack speed cap 120%. Label: evidence, not confirmed. The sheet reads 120.0% while the 10 Nov gear lines add to about 147.5% (Leoric 12.5, Spirit 45.8, Insight 54.2, Starless 15.0, Stone of Jordan 20). Pass null or Infinity to leave it uncapped. Attack speed past that reading is worth 0.
- Polearm Expertise 10/10. PTR rank 10 is 15%[x] while Healthy, and 1.5% Lucky Hit Chance per level (15% at rank 10). Player Healthy uptime is 1. That uptime is an estimate.
- Might's 8%[x] with a Two-Handed weapon is already on the equipped glyph. It is scored once.
- Whirlwind attack-speed model, default `breakpoints`. `flat` keeps the literal formula reading.
- Base attacks per second 1.0.
- Maximum Fury 826 and Ramaladni's 7% drain.
- Town Fury regeneration 85/s.
- His technique slot is Two-Handed Mace Expertise, 10/10. The old One-Handed Mace Expertise line is not on this setup. The 15%[x] critical strike damage while Berserking on that technique is not added on top of the combat crit sheet.
- Fists of Fate is not on this Double Swing setup.
- Flay bleed refresh. One stack is in the data. Refresh versus snapshot is not.
- Double Swing rank 48. The other skills on his bar are Rallying Cry 39, War Cry 39, Challenging Shout 25, Wrath 39, and Iron Skin 28. Their stored buff numbers are not rescaled.
- Dust Devil payload is `SF_0 × 0.5` in the power file. The tooltip ratio 368 / 461.25 is 0.798. His Twister glyph is +40.2%[x] and +13%[x], and `0.5 × 1.402 × 1.13 = 0.792`. The model keeps the file 0.5 and applies those two glyph lines on the devils only.
- Berserker's Crucible is 3/5. Hellfire Torch's +1 set count is inactive for him. The 200%[x] at 5 seconds is off. S16 removes Splinters, and Leoric's soul counter was not readable, so the 4.1%[x] per soul stays at 0 souls.
- Lunging Strike is not on the bar.

## His Double Swing, projected Season 16 average

The sustained reading, with Starless at 50%[x], is **255.30B/s**. The one-stack Starless reading is 187.22B/s. Peak at the 12,482.6% All Damage frame is 524.92B/s. S15 sheet values stay in place where Season 16 has not published a replacement. The skill coefficient is the only part doubled, from the live 75% base to the PTR 150% base.

Upgrades, measured on that 255.30B/s average:

| Upgrade | Average gain |
| --- | ---: |
| Berserker's Crucible 5-piece, the inactive 200%[x] after 5s of Berserking | +261.27B/s |
| Slice and Dice instead of the +2%[x] per enemy | +43.62B/s |
| Each 10%[x] in place of an attack speed affix that sits past 120% | +25.53B/s |

## Live dummy check

One live cast at the t=30 sheet, with the known [x] lines and without the shout buffs, is 38.30B. The larger Twin Strikes sweep is about 14B of that. The dummy's readable hits run from about 13B to 157B, with the top around 139-157B. The modeled sweep sits on the low end of that band. The top of the band is higher than this cast. Combat Critical Strike Damage 10,396.6% is the crit input. Town crit 7,139% times 1.45 is 10,352, close to that combat reading, so Flawless Technique's 45%[x] is treated as already inside the combat crit number and is not multiplied again. Leoric's 4.1%[x] per soul is off because the counter was not readable and Season 16 removes Splinters. A boss dummy also does not die, so Leoric's on-kill soul does not stack during the check.

## Proposed Season 16 Double Swing

Scenario `ds-s16-proposed`. Jewelry is +1 set count each: the two rings are +1 Sescheron's Fury each, and the amulet is +1 Berserker's Crucible. That +1 per jewelry piece is Nikolay's instruction. The checkout has no ring or amulet affix that says it. The only +1 set-count strings are Hellfire Torch lines, each for one named set.

Seal of the Diamond Mind confirms the charm discount. Item `Talisman_Seal_MythicUnique_03` sets `Talisman_Charm_Slot_Count_Base` to 6. A legendary seal is 5, a rare seal is 4, and a magic seal is 3, so the 6 slots are the mythic seal's slot count. The forced affix `Talisman_SealAffix_Ancestral_03` is named of Royal Grandeur. Its attribute is `Set_Item_Discount` = 1. The string says it reduces the charms needed for set bonuses by 1, to a minimum of 2. It is not a set count.

With that discount, Crucible 5/5 is the amulet +1 plus 3 charms, and Sescheron's 5/5 is the two rings plus 2 charms. That is 5 of the 6 slots. Fists of Fate exists as charm `Talisman_Charm_Unique_Gloves_Unique_Generic_002` and takes the sixth. Both sets at 5/5 and Fists of Fate fit. Without the discount the same jewelry would need 4 + 3 = 7 charms, which does not fit.

The recommended gear, on his rank-48 sheet, scores **2,857.63B/s to 3,407.18B/s** average and **2,903.84B/s to 3,462.27B/s** peak at the 2.42 casts per second cap. The low end is Selig with Edgemaster. The high end is Crushing on the amulet and Edgemaster on the rings. His current setup is 255.30B/s average and 524.92B/s peak. The cap high end is about ×13.3 on the average. The headline rate is the stripped 1.2375 casts per second, where that high end is 1,742.31B/s average and 1,770.48B/s peak.

| Choice | Average at 2.42 | Peak at 2.42 | Against the other option |
| --- | ---: | ---: | --- |
| Amulet Crushing, rings Edgemaster | 3,407.18B/s | 3,462.27B/s | +549.55B/s average versus Selig with the same rings |
| Amulet Selig, rings Edgemaster | 2,857.63B/s | 2,903.84B/s | Keeps the low-life fury shell |
| Amulet Crushing and Crushing on the rings | 2,271.45B/s | 2,308.18B/s | A second Crushing is not stacked |
| The Grandfather's 120%[x] crit, added to the Crushing row | ×2.200 | ×2.200 | Only if the bonus applies while the swords swing |

Ranked by average damage: both 5-piece sets, then Fists of Fate's expected value, then Crushing instead of Selig (+549.55B/s at the cap), then Edgemaster instead of a second Crushing. Heavy Hitting is 40–60%[x] and the string limits it to Dust Devils, Earthquakes, or Iron Shrapnel. Dust devils are about 23% of this cast, so a mid 50%[x] on that share is about ×1.12 on the cast. Edgemaster at full Fury is 50%[x] on the whole cast. Crushing's mid of the stored 45–65%[x] is 55%[x] while Fortified. One Crushing and one Edgemaster is the pair. A second copy of either aspect is not stacked.

Duelist's Aspect stores 4.5–6.5% weapon damage per stack and the bucket is empty, so it is unscored. The Furnace is 260%[x] to Elites on the two-handed mace. Double Swing swings the swords, so that line is not applied. Warpath is [x] only while wielding a bludgeoning weapon. Those two-handed picks do not change this score. Disobedience in the PTR string is damage reduction from damage over time, so the chest adds no damage. Cir then Vex grants +1 to all skills for 10 seconds after five casts, and the overflow text stops at +3. That rank bump is not folded into the rank-48 coefficient. Bac then Jah replaces Evade with Teleport and grants Unstoppable. No damage number is scored. The seal's Sescheron attack-speed affix points at `GearAffix_AttackSpeed` with a formula of 0, and that table is not in the checkout.

The sheet with Leoric's, Spirit, Insight, Stone of Jordan, and Starless removed shows Weapon Speed 1.10 and Attack Speed Bonus 12.5%. The label beside 1.10 is cropped. It sits on the row above Bonus 12.5%, and the next row is a 27.8% chance, which is the same order as the earlier full sheet: Weapon Speed, then Attack Speed Bonus, then Critical Strike Chance. The swords also print 1.10 attacks per second. So 1.10 is the weapon base, and 12.5% is the separate non-gear bonus. Boosted attacks per second are 1.10 × (1 + bonus). At 12.5% that is 1.2375 per second. At the 120% cap it is 1.10 × 2.20 = 2.42 per second. Reading 1.10 as an already-boosted rate would imply a weapon base of 1.10 / 1.125 = 0.978, which the item tooltip does not show. The dropped gear lines still add to 147.5% and were the part past the cap. They are gone on this sheet.

Fury cost without Stone of Jordan is the file's 20 per cast. At the 1.2375 per second baseline that is 24.75 spent. Ramaladni still drains 7% of 827, which is 57.89. Against regeneration 80 the bare net is −2.64 per second. Wrath's 3 Fury per critical strike is about 8.9 per second here, and with Tibault's 25 while Unstoppable the net is about +31. If Insight's +47 was inside the sheet 80, regeneration is 33, the bare net is −49.64, and those extras finish at about −16. At the 2.42 cap the bare net is −26.29, and the extras bring the sheet-80 reading to about +16. Tuskhelm's 6 per second is only while the enrage proc is up. The 33 reading is an estimate.

Selig is the low-life shell: damage is dealt to Fury before life, maximum Fury is doubled, maximum life is cut by 75%, and above 50 Fury he gains 30%[x] and Berserking. Crushing on the amulet drops that shell. The 30%[x] is the scored loss. The life and Fury changes are not in the damage number. Mid rolls are flagged: Tuskhelm 45%[x] of 40–50, Edgemaster 50%[x] of 40–60 at full Fury, Crushing 55%[x] of the stored 45–65, Challenger 15.6%[x] from the old transcription because the new glyph level is not on the screenshots. Slice and Dice has `SF_23` = 0 on 3.3_ptr and 0.4 on 3.2, so the cast-speed penalty is gone. The Twister glyph's 40.2%[x] and 13%[x] leave with that glyph. The skill still creates three Dust Devils at `SF_0 × 0.5`. Jewelry gems at flawless quality are 900 resistance for ruby, topaz, and sapphire, so they tie for damage. Weapon skulls are 20%[x] damage. Armor rubies are +40 Strength. One swinging-sword skull replaces the old 24%[x] physical gem.

## Golden Epiphany

Scenario `ds-s16-golden-epiphany` uses the same gear and the same attack-speed and sheet caveats. The talisman changes.

Seal of the Golden Epiphany is item `Talisman_Seal_MythicUnique_02`. `Talisman_Charm_Slot_Count_Base` is 6, the same as the other mythic seals. The forced affix is `Talisman_SealAffix_Ancestral_02`, named of Nobility. Its attribute is `Unique_Charm_Count_Bonus` = 2. The string says the seal can equip up to 3 unique charms. There is no `Set_Item_Discount` on this seal, so the Diamond Mind charm discount does not apply.

The six charms are 3 Crucible pieces, Fists of Fate, Nomad's Longing Heart, and Blood-Mad Idol. The three uniques match the string's cap of 3. Jewelry is +1 Crucible on the amulet and on each ring, which is 3, plus 3 charms, which is 6. The Crucible powers in the files stop at the 5-piece line. No 6-piece damage power is in the checkout, so the count is scored as 5 and one count is unused. There is no Sescheron's Fury.

Nomad's Longing Heart, `Amulet_Unique_Barb_104_x2`, is 30–40%[x] Core damage and 25%[x] more Fury cost. The string doubles the damage against Healthy and Injured enemies. The mid is 35%[x], and the doubled mid is 70%[x]. That doubled uptime is an estimate. Blood-Mad Idol, `Amulet_Unique_Generic_102`, has `Affix_Value_1` of 80–100%[x]. The mid is 90%[x] and is flagged. It also forces Berserking. The static 200%[x] over 8 seconds is damage taken and is not scored as damage dealt.

The jewelry +1 is still not an affix string, so it is not clear whether those pieces can also carry Crushing, Selig, or Edgemaster. Both cases are scored. Case (a) keeps Crushing on the amulet and Edgemaster on a ring. Case (b) drops both.

| Reading | Average at 2.42 casts/s | Peak at 2.42 | Average at 1.2375 | Peak at 1.2375 |
| --- | ---: | ---: | ---: | ---: |
| Proposed, Crushing and Edgemaster | 3,407.18B/s | 3,462.27B/s | 1,742.31B/s | 1,770.48B/s |
| Golden Epiphany, aspects stay | 1,990.35B/s | 1,498.36B/s | 1,017.80B/s | 766.21B/s |
| Golden Epiphany, aspects drop | 856.07B/s | 644.46B/s | 437.76B/s | 329.55B/s |

The 1.2375 column is the S16 baseline: weapon speed 1.10 times the 12.5% bonus on the stripped sheet. The 2.42 column is the same scores at the 120% cap. The proposed setup still wins. Sescheron's 600%[x] is ×7. Nomad's doubled mid and Blood-Mad's mid are ×1.70 and ×1.90, together ×3.23. The 5-piece is ×2.17 that pair.

Each +10% attack speed, from 12.5% up to the 120% cap, adds 0.11 casts per second and 154.87B/s of average damage on the proposed Crushing and Edgemaster row. The step is constant, so the model is linear in the bonus. Double Swing's power uses `Attacks_Per_Second_Total` and has no frame table. `SF_23` is 0 on 3.3_ptr. The Whirlwind frame breakpoints are not applied here. Calling the step linear is an estimate.

On that same baseline, Edgemaster on a ring is +580.77B/s. Crushing on the amulet instead of Selig is +281.02B/s, because Selig already has 30%[x]. Crushing with no amulet damage line under it is +412.16B/s. A +10% attack speed affix is +154.87B/s. Edgemaster and Crushing both beat one attack speed affix for the slot. Matching Edgemaster's 50%[x] takes about +37.5% attack speed on that one slot.

The Sescheron seal line of the Fervent and the Crucible seal line of Volatility both point at `GearAffix_AttackSpeed` with a stored formula of 0. That formula table is not in the checkout, so the percent stays unresolved. There is no 8–10% figure in these files. Crucible's 2-piece, `Talisman_SetPower_Barb02_01`, has static values 50 and 20: 50%[+] Berserking damage and 20%[+] cast speed. Cast speed is a different stat from the 12.5% Attack Speed Bonus, and it is not added into that 12.5%. The numbered attack speed on this gear is the 12.5% non-gear bonus. The cap is still 107.5 points above that.

The same stripped sheet shows Maximum Fury 555, Fury Regeneration 12, Fury Generation 30.0%, Fury On Kill 11, and Cooldown Reduction 9.0%. The old 827 and 80 or 85 readings were the geared sheet. Ramaladni's file value is 0.35–0.50%[x] per Fury, and the screenshot roll is 0.50%. The drain is a static 7% of maximum Fury per second. At 555 that drain is 38.85. Sescheron's 5-piece, `Talisman_SetPower_Barb01_03`, adds 50 maximum Fury, so the proposed pool is 605 and the drain is 42.35. The damage line becomes 0.50% × 605 = 302.5%[x]. The seal's maximum-Fury and Fury-generation lines use formula tables that are not in the checkout, so those percents stay unresolved. Edgemaster's 50%[x] is the full-Fury reading. A bar that drains does not get it. Half of that mid, 25%[x], is the estimate used while the pool is falling.

At 1.2375 casts per second the Double Swing cost is 24.75 Fury. With regeneration 12, the 42.35 drain, and critical-strike Fury at the stripped 27.8% crit chance, the opening net is −52.62 per second. Crucible's 5-piece, `Talisman_SetPower_Barb02_03`, confirms 30% Fury cost reduction after 5 seconds and 10 Fury per second after 10 seconds. Those static values are 30, 10, and 10. The net is still −45.20 from 5 to 10 seconds and −35.20 after that. A full pool of 605 lasts 11.5 seconds at the opening net. It does not sustain, and there is no filler on the bar. Fury on kill is 11 and the dummy does not die, so that line is 0 here. Wrath's 3 Fury per critical strike is not multiplied by the 30% Fury Generation in any formula in the checkout. Scaling it by 1.30 adds about 0.7 per second and does not close the gap. Tibault's 25 while Unstoppable, even at a full uptime that is only an estimate, still leaves the opening net at −27.62 and empties the pool in 21.9 seconds. After the 10-second bonus that same 25 leaves the net at −10.20, and the pool lasts 59.3 seconds. Twin Strikes has no Fury number. Tuskhelm's 6 per second is the enrage proc, not a steady regen.

A Lunging Strike filler generates 12 per cast. At this attack rate that is about 19 per second, which is less than the 42.35 drain, so a basic skill does not keep the bar up. More maximum Fury makes the 7% drain larger. Cost reduction does not touch the drain. The swap that uses a known item is taking Ramaladni's off. The drain becomes 0. After the 10-second Crucible bonus the net is +7.15 per second, and the opening dip stays inside the 605 pool. The damage cost is the 302.5%[x] line. At the 1.2375 baseline the full-Fury Edgemaster row falls from 1,742.31B/s average to 432.87B/s without that line. Keeping Ramaladni and casting until the pool empties at 11.5 seconds, then stopping, averages 333.85B/s over 60 seconds, which is below the steady no-Ramaladni number. The sustained-Fury baseline, which the sustain math does not support until the gap below is closed, is 1,742.31B/s average and 1,770.48B/s peak. The draining Edgemaster estimate, 25%[x], is 1,451.92B/s average and 1,475.40B/s peak, and that rate also ends when the pool empties. The scenario now keeps the Double Swing coefficient, the observed sheet, and the sword cast rate. An earlier 1,591.33B/s reading used the bleed formula because the scenario id no longer matched Double Swing.

## Checkpoints

These are watch items. The sustained-Fury gear case is Crushing on the amulet, one Crushing ring, one Edgemaster ring, the Diamond Mind seal, and Fists of Fate, at 1.2375 casts per second. The stored-tooltip rotation averages **1,742.31B/s**, with a peak of **1,770.48B/s**. That average is not 100% Wrath. On a 60 second clock it is Wrath for 52.7% of the minute: the catalog cooldown is 54.32 seconds and the duration is 15.8 seconds, the video sheet cooldown reduction is 39.4%, and Marshal is off because the observed sheet clears glyphs. The realistic headline, at the file cooldown and the stripped 9% plus Marshal, is **1,120.03B/s**. A second Crushing is on the plan and is not scored as a second multiplier. The Fury-starved downside is 333.85B/s if he spends the pool for 11.5 seconds and then stops, or 432.87B/s if Ramaladni's comes off and the bar can stay up.

Attack speed curve on that sustained average. The step is linear. The 120% cap is probable and switchable.

| Attack speed | Casts/s | Average |
| --- | ---: | ---: |
| 12.5% | 1.2375 | 1,742.31B/s |
| 40% | 1.54 | 2,168.21B/s |
| 80% | 1.98 | 2,787.69B/s |
| 120% | 2.42 | 3,407.18B/s |

### Fury

The target is Ramaladni's 7% of maximum Fury plus the Double Swing spend. At 605 maximum Fury the drain is 42.35/s.

| Stage | Drain | Spend | Have | Gap |
| --- | ---: | ---: | ---: | ---: |
| Current geared sheet, 827 Fury, 2.42 casts/s, cost 26, regen 80 | 57.89 | 62.92 | 80 | 40.81 before crit Fury and Tibault. The dummy stayed full, so the practical gap was 0 |
| Stripped sheet, 555 Fury, 1.2375 casts/s, cost 20, regen 12 | 38.85 | 24.75 | 12 | 51.60 |
| Sets online, before 5s | 42.35 | 24.75 | 14.5 with the 27.8% crit Fury | 52.62 |
| Sets online, after 10s, 30% cost cut and +10 Fury/s | 42.35 | 17.32 | 24.5 | 35.20 |
| Sustained target | 42.35 | 24.75 before the cost cut | the gap has to be 0 | he still has to find about 35/s after the Crucible bonus |

### Attack speed

| Stage | Bonus | Distance to 120% | Casts/s |
| --- | ---: | ---: | ---: |
| Current geared sheet | 120% | 0 | 2.42 |
| Stripped sheet | 12.5% | 107.5 points | 1.2375 |
| Proposed gear, numbered lines only | 12.5% | 107.5 points | 1.2375 |
| Cap, if he restores it | 120% | 0 | 2.42 |

### Cooldowns

`CDR needed = 1 - duration / cooldown`, using the file bases. The sheet applies CDR as one minus the total. Whether separate rolls add or multiply is ESTIMATE. Crucible's 10% after 10 seconds of Berserking is in the 5-piece static values. Whether it adds to the 9% sheet is ESTIMATE. Marshal's 2 second cut is his 10 Nov glyph tooltip, not a formula re-read here, so that uptime is ESTIMATE.

| Skill | Duration | Cooldown | CDR for 100% | Uptime at 9% |
| --- | ---: | ---: | ---: | ---: |
| Rallying Cry | 4.0s | 0 unless Upgrade C | none. It is a recast | recast |
| War Cry | 4.0s | 25s | 84.0% | 17.6% |
| Challenging Shout | 8.0s | 25s | 68.0% | 35.2% |
| Wrath of the Berserker | 16.0s | 90s | 82.2% | 19.5% |
| Iron Skin | 3.0s | 14s | 78.6% | 23.5% |

The temper files for generic cooldown reduction and for War Cry, Challenging Shout, Iron Skin, and Wrath store formula 0. The roll table is not in the checkout, so the points per roll and the number of rolls are unresolved. The gap from 9% to Wrath's 82.2% is 73.2 points.

Twin Strikes, `Gloves_Unique_Barb_100_x2`, grants Berserking for 3 seconds on the later sweep. The static value is 3. At 1.2375 casts per second the next cast is 0.81 seconds away, so that 3 seconds covers the gap while he is spending. ESTIMATE that each cast refreshes it. War Cry's Berserking is 4 seconds and its file cooldown is 25 seconds, so War Cry alone does not keep a 5 second streak. With the Twin Strikes estimate, the Crucible 200%[x] stays up outside Wrath. Blood-Mad is not in this plan. Wrath still adds its 30%[x], Unstoppable, and the Overpower window. Iron Skin's 3 second Unstoppable is in the file, and the catalog has no duration for it, so Tibault stays off outside Wrath. The doubled Berserking keyword is still not a scored damage line.

The stored-tooltip rotation splits into 2,784.16B/s while Wrath is up and 583.06B/s while it is down. Weighted by its own 52.7% that is the 1,742.31B/s average. The down side of that split lets the Crucible streak fall off, because only War Cry is supplying Berserking.

The corrected table uses two file-timed rotations at 9% cooldown reduction. Wrath's file cooldown is 90 seconds and its duration is 16 seconds. War Cry and Challenging Shout use 25 seconds. Marshal cuts non-Shout cooldowns by 2 seconds after each of those shouts. The cast gap settles at 68.25 seconds, so the repeating uptime is 16 / 68.25 = 23.4%. A 60 second clock that opens on the cast only contains one 16 second window, which is 26.7%, because the next cast is past the minute. The Wrath-up rotation holds Wrath, Unstoppable, and Overpower for the whole minute, and Twin Strikes keeps Berserking in both rotations. ESTIMATE on the hold, the refresh, and the 2 second cut. Crucible's own 10% cooldown reduction is not in this uptime.

| Wrath uptime | Average |
| --- | ---: |
| 100% | 2,580.50B/s |
| 90% | 2,389.73B/s |
| 75% | 2,103.58B/s |
| 50% | 1,626.65B/s |
| 23.4%, 9% CDR plus Marshal, repeating | 1,120.03B/s |

The 100% row is the Wrath-up rotation, 2,580.50B/s. The other rows are that rate blended with the no-Wrath rotation, 672.80B/s. The realistic headline is the 23.4% row.

### Crit chance

The stripped sheet's chance row is 27.8% after Leoric's, Spirit, Insight, Stone of Jordan, and Starless are removed. The files do not split that 27.8% into base, paragon, and leftover gear. Fists of Fate is not a crit-chance line. The planned pieces do not add a stored crit-chance roll. Tempered crit-chance formulas in the datamine are 0, same missing table as the cooldown tempers. The gap to 100% is 72.2 points, and the rolls that would close it are unresolved.

At the headline's crit damage, 10,396.6%, and the combat-allbuff All Damage of 8,211.3%, each +10% crit chance below the cap is worth 5.56% of that slice's full-crit damage. On the 1,742.31B/s average that is 96.83B/s. Slices that use the no-buff additive are worth more per point. ESTIMATE.

Nomad changes Fury. The cost becomes 25 per cast. At 1.2375 casts per second that is 30.94 spent. Against regeneration 80 and the 57.89 drain, the bare net is −8.83 per second. Wrath's crit Fury and Tibault's 25 while Unstoppable bring it to +25.08. If Insight's 47 was inside the 80, regeneration is 33, the bare net is −55.83, and those extras finish at −21.92. At 2.42 casts per second the bare net is −38.39, and the extras bring the sheet-80 reading to +4.03. Blood-Mad adds no Fury number. Tuskhelm's 6 per second still depends on the enrage proc.

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
