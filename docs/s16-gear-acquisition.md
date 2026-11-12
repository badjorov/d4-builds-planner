# Season 16 gear acquisition

Provisional, from the 3.3_ptr files. This is the hunt order for `ds-s16-proposed`. Nikolay starts with no gear. The realistic headline at commit `d3ede84` is **1,120.03B/s** at 1.2375 casts/s and 23.4% Wrath uptime. That figure sits on the November combat sheet plus every scored line and a sustained Fury bar. A naked weapon's damage is not in these files, so the running table does not invent a billions number before that full model.

Item-type labels, from `ItemType/*.itt.json` `arItemLabels`:

| Slot | File | Labels |
| --- | --- | --- |
| Helm | `Helm.itt` | 16, 14, 54 |
| Chest | `ChestArmor.itt` | 17, 14, 54 |
| Gloves | `Gloves.itt` | 28, 14, 54 |
| Pants | `Legs.itt` | 30, 14, 54 |
| Boots | `Boots.itt` | 29, 14, 54 |
| Amulet | `Amulet.itt` | 26, 18, 54 |
| Ring | `Ring.itt` | 19, 18, 54 |
| 1H sword | `Sword.itt` | 2, 8, 0, 54, 5 |
| 2H sword | `Sword2H.itt` | 2, 9, 0, 54, 5 |
| 2H mace | `Mace2H.itt` | 3, 9, 0, 54 |
| Charm | `Charm.itt` | 71 |
| Seal | `HoradricSeal.itt` | 70 |

Label 14 is on every armor piece, 18 on both jewelry pieces, 0 on weapons, and 54 on all of them. An affix whose only label is 54 is not a slot pick. `arInnateStatList` is empty on these types, so sockets per slot are UNRESOLVED. Rune recipes exist per slot (`Recipe_Jeweler_RuneCrafting_Helm` and the matching chest, gloves, legs, boots, amulet, rings, 1H and 2H recipes), so those slots can take a runeword.

Normal affixes whose text is Attack Speed, Critical Strike Chance, Cooldown Reduction, or Maximum Fury store formula `0`. Their ranges are UNRESOLVED. The records and the labels they do carry:

| Record | Text | Labels | Range |
| --- | --- | --- | --- |
| `AttackSpeed` | +#% Attack Speed | 28 (gloves) | UNRESOLVED |
| `CritChance` | +#% Critical Strike Chance | 28 (gloves) | UNRESOLVED |
| `CritChanceJewelry` | +#% Critical Strike Chance | 19, 23 | UNRESOLVED |
| `INHERENT_CritDamage` | +#% Critical Strike Damage | 19 (ring) | UNRESOLVED |
| `CooldownReductionCDR` | #% Cooldown Reduction | 26, 16, 23 (amulet, helm, and 23) | UNRESOLVED |
| `Resource_MaxFury` | +# Maximum Fury | 16 (helm) | UNRESOLVED |
| `CooldownReductionCDR_UBERUNIQUE` | #% Cooldown Reduction | 26, 16, 23 | 0.07 literal |
| `S14_Mythic_CooldownReductionCDR` | Mythic CDR | 0, 14, 18, 29, 17, 28, 16, 30, 15 | 0.20 literal |

Label 23 is not on Helm, Chest, Gloves, Legs, Boots, Amulet, Ring, or the swords. What item type owns 23 is UNRESOLVED.

Tempers do not publish a roll. `Tempered_Generic_CDR_Tier3`, `Tempered_Generic_AttackSpeed_Tier3`, `Tempered_Generic_CritChance_Tier3`, and `Tempered_CDR_Skill_Barb_WrathoftheBerserker_Tier3` are formula `0`. Each `Tempering_*_Tier3` recipe lists several ingredient conditions, including `Item_Is_Normal_to_Rare_Armor`, `Item_Is_JewelryOrWeapon_and_NonAncestral`, and `Item_Is_Ancestral` or the ancestral armor/weapon split. The file does not say which ingredient is the piece being tempered, so a temper is not pinned to one slot here.

The cube is in the files. `Horadric_Cube_Crafter.crf` is the crafter. `X2_HoradricCube_Bundle_AddAffix` bundles add-affix recipes for Offensive, Defensive, Resource, Utility, Resistance, Skill, and Random. `X2_HoradricCube_Transfigure` is the transfigure recipe. `S16_Recipe_Greater_Temper` exists and its `arTemperedAffixes` list is empty, so a Season 16 greater-temper roll is not in that recipe. None of these recipes store a damage number. The extra affix is another roll from the slot pool, and that roll is UNRESOLVED wherever the affix formula is 0.

Gems, top tier in the files. `Item_Gem_Ruby_09` is named Flawless Horadric Ruby. `eSocketTarget` is 0, 1, or 2. Which target is weapon, armor, or jewelry is not named on the item. The scored reading treats 0 as weapon, 1 as armor, and 2 as jewelry. That assignment is ESTIMATE.

| Gem file | Target 0 | Target 1 | Target 2 |
| --- | --- | --- | --- |
| `Gem_Skull_09` | all-damage ×0.32 | healing received 0.38 | Resistance 4375 |
| `Gem_Ruby_09` | fire/holy ×0.32 | Strength 150 | Resistance 4375 |
| `Gem_Diamond_09` | all-damage ×0.28 | +50 all stats | Resistance_All 625 |

`Gem_Ruby_05` is the older 0.20 / Strength 40 / Resistance 900 row. It is not the item named Flawless. The resistance display scale is UNRESOLVED. For a physical Double Swing, the weapon socket whose formula is all-damage is `Gem_Skull_09` target 0. Ruby's weapon line is fire and holy only.

Runes are powers, not a solved pair. `Item_Rune_Effect_GainResource` is Lum, formula 3.5, unit UNRESOLVED. `Item_Rune_Effect_FlatCDR` is Eom, formula 0.1, unit UNRESOLVED. `Item_Rune_Effect_ReduceUltimateCD` is Zec, formulas 1 and 0.5, unit UNRESOLVED. Conditions that match a spender are Cir (`CastRepeatSkill`, formulas 5 and 3), Tam (`OnCastCoreSkill`), and Poc (`OnSpendResource`). Vex (`BonusToAllSkills`) has the buff text "+1 to all Skills per Stack" and formulas 10, 1, and 3. Which formula is the duration or the stack cap is UNRESOLVED. None of these are inside the 1,120.03 score.

## Slots

The keep line is the file's own power. The extra affix is the cube add-affix or a temper whose formula is 0, so the number stays UNRESOLVED.

**Helm, Tuskhelm.** `Helm_Unique_Barb_100`. Damage 40–50%[x] (`Affix_Value_2`). The string assigns Static Value 1 to 6 Fury per second and Static Value 2 to 10% cooldown reduction, both while the enrage is up (gaining Berserking while already Berserking). A stored 5 on `Affix_Value_1` has no clause in that Desc. UNRESOLVED. Forced second affix `S04_Life`, formula 0. Keep the unique. The helm pool also has `Resource_MaxFury` and `CooldownReductionCDR`, both UNRESOLVED. Temper families that list a CDR or resource affix: `Tempering_Barb_Resource_Ultimates` (includes Wrath CDR), `Tempering_Generic_Resource_Complex` (includes generic CDR and resource gain). Best extra: a cooldown-reduction or maximum-Fury roll. Range UNRESOLVED. Gem: armor socket, Ruby 09 Strength 150 if target 1 is armor. ESTIMATE.

**Chest, Disobedience.** `legendary_generic_036`, labels 16, 17, 30, 26, 15, so chest (17) is in the list. Damage Reduction from your Damage over Time, `1+(CurrentLegendaryRank()-1)*0.1` percent, for 2 seconds, stacking to 30. Rank caps stored as `[4, 4, 6, 16, 0, 0]`. Which index is live is UNRESOLVED. No damage dealt. Keep it for the reduction. Extra affix: armor, life, or resistance. Those formulas are 0. UNRESOLVED.

**Gloves, Twin Strikes.** `Gloves_Unique_Barb_100_x2`. Initial sweep `Affix_Value_1 * 100` and later sweep `* 200`, roll 0.45–0.60, so 45–60%[x] and 90–120%[x]. Static 3 seconds of Berserking on the later sweep. Forced `S04_SkillRankBonus_Barb_Core_DoubleSwing`, formula 0. Keep the unique. Gloves label 28 also has `AttackSpeed` and `CritChance`, both UNRESOLVED. The weapon temper `Tempering_Generic_Weapon_APSCrit` offers `Tempered_Generic_AttackSpeed` and `Tempered_Generic_CritChance`, formula 0. Best extra: one crit-chance roll and, if a second craft exists, attack speed. Counts of temper slots are not in the recipe. UNRESOLVED. Gem: same armor reading as the helm.

**Pants, Tibault's Will.** `Pants_Unique_Generic_102`. Damage 15–20%[x]. Static 25 Primary Resource regeneration while Unstoppable and for Static 5 seconds after. Forced `S04_Life`, formula 0. Keep the unique. The pants pool is armor label 14 plus pants label 30. A resolved damage-reduction or armor number for a normal affix was not in the formula-0 set. Extra affix UNRESOLVED.

**Boots, Earthstriker's.** `legendary_barb_014_x2`, labels include 29 (boots). One Overpower stack per weapon swap (static 1). Damage `15+CurrentLegendaryRank()*0.5`%[x] while you have Overpower. Rank caps `[6, 6, 11, 16, 0, 0]`. The top is UNRESOLVED. The model uses a screenshot 19.5, which is above the rank-1 value of 15. A new drop is the formula, not 19.5. Keep the aspect. Boots have no separate crit or CDR record in the label set above. Extra affix UNRESOLVED.

**2H mace, The Furnace, or Duelist's.** Furnace is `2HMace_Unique_Generic_001`, 75–100%[x] more damage to Elites, on the mace. Double Swing swings the swords, so this line is not in the sword score. Duelist's on a one-handed weapon is `legendary_barb_005_x2`: weapon damage `0.045+(CurrentLegendaryRank()-1)*0.001`, displayed times 100, up to 10 stacks. Rank-1 display is 4.5% per stack. The damage model does not apply it. The spiritborn Duelist's (`legendary_spiritborn_013_x1`) is maximum Ferocity, not this. Keep Furnace only as the bludgeoning slot if he wants the elite line on mace hits. It does not move the 1,120.03. Extra affix on a 2H mace: the weapon labels include 0 and 9. Attack speed and crit on weapons were formula 0. UNRESOLVED.

**2H sword, The Grandfather, or Warpath.** Grandfather `2HSword_Unique_Generic_001` is 120%[x] Critical Strike Damage, literal. It is not the sword he swings. The model multiplies it only if that bonus applies while the 1H swords swing. That condition is UNRESOLVED, and the 1,120.03 does not include it. Warpath `legendary_barb_001_x2` is `[x]` while wielding a bludgeoning weapon and while Overpower charges are up, `39+CurrentLegendaryRank()*1`. It does not apply to the swords. Keep Grandfather in the 2H sword slot if the 120%[x] is confirmed in game to affect the swinging swords. Until then it is optional.

**1H sword, Ramaladni's.** `1HSword_Unique_Barb_101`. Damage per Fury `0.35–0.50%[x]` (raw 0.0035–0.005, format `2%x`). Static drain 7% of maximum Fury per second. Forced `S04_Resource_Max_AllClasses`, formula 0. Keep a high roll. The drain is the reason it comes after the Fury tools. A fresh drop is not the old screenshot 0.50. Weapon gem: Skull 09, target 0, ×0.32 all damage. ESTIMATE on the target.

**Amulet, Crushing.** `legendary_druid_049_x2`, labels include 26. While Fortified, `0.45+(CurrentLegendaryRank()-1)*0.01`, displayed times 100, so 45%[x] at rank 1. Rank caps `[16, 13, 21, 16, 0, 0]`. Which index is live is UNRESOLVED. The model mid 55%[x] is ESTIMATE. A second Crushing on the ring is the same aspect and is not scored as a second multiplier. Amulet label 26 carries `CooldownReductionCDR`, formula 0. That is the CDR slot to keep. Best extra: that CDR roll, or the Wrath temper from `Tempering_Barb_Resource_Ultimates`. Range UNRESOLVED. Jewelry gem: target 2 is a resistance formula. No target-2 line in these gems is a damage multiplier. Diamond 09's ×0.28 is target 0.

**Ring, Crushing, and ring, Edgemaster.** Edgemaster's is `legendary_generic_063`, labels include 19. Up to `40+(CurrentLegendaryRank()-1)*1`%[x] from current Primary Resource, maximum at full resource. Rank-1 is 40%[x]. The model 50%[x] is ESTIMATE. Same rank-cap caveat. Ring label 19 has `INHERENT_CritDamage` and `CritChanceJewelry`, both formula 0. One ring keeps Edgemaster. The other ring can hold a second Crushing, which adds no second damage line, so that ring's useful rolls are the unresolved crit chance and crit damage. Best extra on each ring: crit chance, then crit damage. UNRESOLVED.

**Seal of the Diamond Mind.** `Talisman_Seal_MythicUnique_03`, forced `Talisman_SealAffix_Ancestral_03`, `Set_Item_Discount` 1. The string reduces charms needed for a set by 1, minimum 2. `Talisman_Charm_Slot_Count_Base` on that seal is 6. No damage number. Seal attack-speed and Fury lines in the other seal affixes use formula 0. UNRESOLVED. No gem.

**Charms.** Sescheron: `Talisman_Charm_Set_Barb_01_01` through `_05`. Crucible: `Talisman_Charm_Set_Barb_02_01` through `_05`. Fists of Fate charm: `Talisman_Charm_Unique_Gloves_Unique_Generic_002`, same power as the gloves, 1% to 250–300%. With the discount, Crucible 5/5 is the amulet's +1 plus 3 charms, and Sescheron 5/5 is two rings at +1 plus 2 charms. The jewelry +1 is still not an affix string. ESTIMATE that the rings and amulet each count as +1. Powers, all static:

| Power | Values |
| --- | --- |
| `Talisman_SetPower_Barb01_01` | Colossal at 100 Fury, 50% and 20% on the other statics, 120%[x]. Power 03 replaces this while the 5-piece is on |
| `Talisman_SetPower_Barb01_02` | +10 Fury when hit, 30% maximum life |
| `Talisman_SetPower_Barb01_03` | +50 maximum Fury, 50% size, 600%[x] |
| `Talisman_SetPower_Barb02_01` | 50%[+] Berserking damage, 20%[+] cast speed |
| `Talisman_SetPower_Barb02_03` | 5s: 200%[x] and 30% Fury cost; 10s: 10 Fury/s and 10% CDR; 20s and 60s statics are 20, 5, 60, 10 |

The 20%[+] is cast speed, not Attack Speed Bonus, and it is not added to the 12.5%.

## Where each stat has to come from

| Stat | Known piece | Still needed | Record |
| --- | --- | --- | --- |
| Fury regen | Crucible +10/s after 10s. Tibault +25 while Unstoppable and 5s after. Tuskhelm 6/s only during the enrage | Enough steady regen to cover Ramaladni's 7% plus the 20 Fury cast | `Tempered_Generic_ResourceGain_Tier3` formula 0. `Resource_MaxFury` formula 0 raises the pool and the drain |
| Attack speed toward 120% | Stripped 12.5% only. Crucible's 20% is cast speed | The rest of the 107.5 points | `AttackSpeed` and `Tempered_Generic_AttackSpeed_Tier3`, formula 0 |
| Crit chance near 100% | Stripped 27.8%. Fists of Fate is not crit chance | 72.2 points | `CritChance`, `CritChanceJewelry`, `Tempered_Generic_CritChance_Tier3`, formula 0 |
| Wrath CDR toward 82%, and at least about 39% | Sheet 9%. Tuskhelm 10% while enraged. Crucible 10% after 10s of Berserking | The gap after those, if they even add | `CooldownReductionCDR` and the Wrath temper, formula 0. Adding the 10% lines to 9% is ESTIMATE |
| Crit damage | Grandfather 120%[x], and only if it hits sword swings | Ring inherent crit damage | `INHERENT_CritDamage` formula 0 |
| Armour, resists, reduction | Disobedience's DoT reduction. Gem resistances as raw formulas | Armour rating | No armour-rating formula with a resolved range was in the slot pools |

## Hunt order

1. **Seal of the Diamond Mind.** Without `Set_Item_Discount` the 3 Crucible charms, 2 Sescheron charms, and Fists of Fate are 6 charms before the jewelry +1 is even counted, and the no-discount layout was 7. The seal is what makes 5/5 plus Fists fit. No damage number.
2. **Twin Strikes.** The cast uses the 60%[x] / 120%[x] split at the top of 45–60. Against two plain sweeps, the same devils and Slice and Dice, that top roll is ×1.383 on the cast coefficient. The low roll, 45/90, is ×1.287. The 3 second Berserking is what lets the Crucible streak stay up outside Wrath. ESTIMATE on the refresh. Rank multiplier at 48 is 6.15.
3. **Sescheron charms, then the two rings.** Power 03 is +50 maximum Fury and 600%[x] (×7) once the count is 5. Power 02's +10 Fury is when hit, not regen. The rings are also the +1 counts. ESTIMATE.
4. **Crucible charms, then the amulet.** After 10 seconds of Berserking the 5-piece is +10 Fury/s, 30% Fury cost, and 10% CDR, and the 5 second mark is 200%[x]. That is the first resolved state where the Fury net is positive, and only while Ramaladni is not equipped.
5. **Edgemaster on one ring.** Rank-1 is 40%[x] at full Fury. The finished model uses 50%[x], which is ESTIMATE. On that finished 1,120.03 the 50%[x] is a ×1.50 that is on in both the Wrath and the no-Wrath rotations.
6. **Crushing on the amulet.** Rank-1 is 45%[x] while Fortified. One copy. The second ring does not get a second Crushing multiplier.
7. **Ramaladni's.** At 605 Fury the 7% drain is 42.35/s. A 0.50%[x] per Fury roll is ×4.025. A 0.35 roll is ×3.1175. The damage is why it is in the plan. It comes after the Fury tools because it reopens the gap.
8. **Fists of Fate charm.** Fills the sixth slot. 1% to 250–300% lucky hit. Already inside the 1,120.03.
9. **Tibault's Will.** 15–20%[x] and +25 regen while Unstoppable and for 5 seconds after. The uptime is the Wrath window, 23.4% at 9% CDR plus Marshal, so most of the minute does not have the 25.
10. **Tuskhelm.** 40–50%[x] plus 10% CDR and 6 Fury/s during the enrage. The 10% is the only other resolved CDR. It does not by itself reach 39% or 82%.
11. **Earthstriker's.** Overpower damage on a weapon swap. The Wrath window is when Overpower is up in the model. Rank-1 is 15%[x], not the screenshot 19.5.
12. **Disobedience.** Damage reduction from damage over time. No change to the damage score.
13. **Grandfather, Furnace, Warpath, the second Duelist's.** Grandfather is 120%[x] crit damage if it applies to the swinging swords. The others do not change the sword score. They are last.

## Checkpoints

Fury net is regen 12, plus crit Fury at 27.8% and 1.2375 casts/s, minus the 20 Fury cast, minus Ramaladni's drain when that sword is on. After the Crucible 10 second mark the cost is ×0.7 and regen gains 10. Attack speed stays 12.5% and crit stays 27.8% because no resolved roll adds to them. Armour and resists stay empty. Wrath uptime is 16 / (90 × 0.91) = 19.5% until Marshal's cut is included, and 16 / 68.25 = 23.4% at 9% CDR plus that cut. Adding Tuskhelm's 10% or Crucible's 10% on top of 9% is ESTIMATE, so those rows leave CDR and uptime unresolved rather than invent a sum.

| After | Fury net/s | Attack speed | Crit | CDR | Wrath uptime | Crit damage | Armour / resists | Average DPS |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| No gear | −10.27 | 12.5% | 27.8% | 9% | 19.5% | UNRESOLVED | UNRESOLVED | UNRESOLVED |
| Diamond Mind | −10.27 | 12.5% | 27.8% | 9% | 19.5% | UNRESOLVED | UNRESOLVED | UNRESOLVED |
| Twin Strikes | −10.27 | 12.5% | 27.8% | 9% | 19.5% | UNRESOLVED | UNRESOLVED | cast ×1.383 at the 60/120 top. Absolute UNRESOLVED |
| Sescheron 5/5 | −10.27 | 12.5% | 27.8% | 9% | 19.5% | UNRESOLVED | UNRESOLVED | 600%[x] is on. Absolute UNRESOLVED |
| Crucible 5/5, after 10s, no Ramaladni | +7.15 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | 200%[x] is inside the finished model. Absolute UNRESOLVED |
| Edgemaster | +7.15 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | rank-1 40%[x]. Model 50%[x] is ESTIMATE |
| Crushing | +7.15 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | rank-1 45%[x]. One copy |
| Ramaladni's, after 10s | −35.20 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | 0.35–0.50%[x] per Fury. Drain 42.35/s at 605 |
| Fists of Fate | −35.20 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | lucky hit, already in the finished model |
| Tibault's | −35.20 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | +25 regen only while Unstoppable |
| Tuskhelm | −35.20 | 12.5% | 27.8% | UNRESOLVED | UNRESOLVED | UNRESOLVED | UNRESOLVED | 40–50%[x] during the enrage |
| Full plan, sustained Fury | −35.20 from the known lines | 12.5% | 27.8% | 9% on the sheet. The 23.4% uptime includes Marshal and not the extra 10% lines | 23.4% | Grandfather 120%[x] is not in this DPS | UNRESOLVED | **1,120.03B/s** |

The last Fury net is still −35.20/s. The 1,120.03B/s headline assumes that gap gets closed. The known pieces do not close it.

## What the files cannot close

Read these in game. The files do not have the number.

- Roll ranges for `AttackSpeed`, `CritChance`, `CritChanceJewelry`, `INHERENT_CritDamage`, `CooldownReductionCDR`, `Resource_MaxFury`, and every `Tempered_*` formula that is 0. One kept item of each will do.
- Whether CDR from the sheet, Tuskhelm's 10%, Crucible's 10%, and a temper add or multiply.
- Which `arMaxLegendaryRanks` index is the live cap for Edgemaster, Crushing, Earthstriker, Duelist, Disobedience, and Warpath.
- How many gem sockets a helm, chest, gloves, pants, boots, amulet, ring, and weapon actually have. The item types store none.
- The display scale for gem Resistance 4375 and Resistance_All 625, and whether socket target 0, 1, and 2 are weapon, armor, and jewelry.
- Lum 3.5, Eom 0.1, and Zec 1 and 0.5, in the units the tooltip uses.
- Whether the jewelry pieces he finds are +1 to the named set. No ring or amulet affix in the checkout says that.
- Whether Grandfather's 120%[x] applies while the 1H swords swing.
- His armour rating, his crit damage on a stripped new character, and his weapon damage before the November sheet. The 1,120.03 uses that November sheet.
- `S16_Recipe_Greater_Temper` lists no affixes. A greater temper's roll, if the cube offers one, has to be read off the item.
