# Datamined values against the hand-entered catalog

Hand-entered values are unchanged. Parsed live values sit beside them. This file is the comparison.

Live: DiabloTools/d4data branch `3.2`, commit `75e619f0d90a0951945747f45feef59c076a5db0`, build 3.2.4.74043.
PTR: branch `3.3_ptr`, commit `4685d49dec56566f64da847df0709dbd2d66b832`, build 3.3.0.74145. Every PTR record is provisional. On the rows below the PTR column is "same" when the live formula and the PTR formula match.
Names and the slot vocabulary come from josdemmers/Diablo4Companion commit a52216f51dcd8434feaf7f3aec3978146233ba79 (data updated for v3.2.3.73883).

FloatRangeWithIntervalUniqueAffixPityBonus(SharedRandomFloat(), step, min, max) is read as an inclusive roll from min to max. The first number after the random source is stored as step and is not applied as a filter. FloatRandomRangeWithIntervalUniqueAffixPityBonus(step, min, max) is the same triple with the random source left out. That order is unverified. It is the order that reproduces Furnace 75–100, Tuskhelm 40–50, Leoric 35–50, and the Blood-Mad Idol affix 80–100. On Ramaladni the stored step is 10 while the raw roll is 0.0035–0.005, so that first number may be an interval count instead of an absolute step. The raw argument is kept either way. arMaxLegendaryRanks is stored. bIgnoreLegendaryScaling is stored. Neither is applied to min or max. Masterwork, greater-affix, and legendary-rank scaling are not in these three arguments. A tooltip token Affix_Value_N*100 multiplies the parsed min and max by 100 before they are compared with a percent. The format specifier is read from that token: %x is multiplicative [x], %+ is additive [+], and a bare % is a plain percent with a null damage bucket. fAllowedForPlayerClass index 2 is Barbarian. A record is in scope when that index is 1, when every index is 1, or when every index is 0. Other indexes are not given class names.

Charms and seals live in item types `Charm` (`Charm.itt`, body slots 24–29) and `HoradricSeal` (`HoradricSeal.itt`, body slot 23). Unique charms are items named `Talisman_Charm_Unique_*`. Their forced affix is usually the parent unique affix. Horadric seals use the seal item type. Talisman string lists are `Item_Talisman_*` and `Affix_Talisman_*`.

The affix Talisman_Charm_Affix_Amulet_Unique_Generic_102 parses to 75–125 [x] with static 400, 16. No checked-out item forces that affix. The Blood-Mad Idol amulet and its charm item both force Amulet_Unique_Generic_102.

Soul-splinter socket attributes, by item tier: Lesser Splinter of the Black Soulstone 1; Splinter of the Black Soulstone 1.5; Greater Splinter of the Black Soulstone 2; Abyssal Splinter of the Black Soulstone 2.5. The power `S15_Socketable_BlackSoulstone` divides that attribute by 100, and a second formula is `1 / 100` (1% damage taken). The power string that was fetched says only "Damage dealt and taken increased" and has no %x or %+ token, so the damage bucket is not taken from a format specifier. PTR matches live on these attributes.

The Furnace linked affix is 75–100%[x] (format `0%x`), step argument 10. The charm item forces that same affix. 150–200 is not in this build. Blood-Mad Idol's linked affix is 80–100%[x] (format `%x`), and the self-burn is static 200%[x] over 8 seconds. Both Berserking lines use `%x`, not `%+`.

## Mismatches first

| Item | Our value and bucket | Parsed live value and bucket | PTR | Match |
| --- | --- | --- | --- | --- |
| Abyssal Splinter of the Black Soulstone, attribute | 2.5 [x] | 2.5 none | same | no (bucket differs) |
| Blood-Mad Idol, additional damage (linked affix) | 75–150 [x] | 80–100 [x] | same | no (range differs) |
| Blood-Mad Idol, damage taken | 200 none | 200 [x] | same | no (bucket differs) |
| Gohr's Devastating Grips, Whirlwind increased damage | 98–117 [x] | 75–90 none | same | no (range differs; bucket differs) |
| Leoric's Crown, gem effect | 65 [x] | 35–50 [x] | same | no (value is outside the parsed base range) |
| Splinter of the Black Soulstone, item of that name | 2.5 [x] | 1.5 none | same | no (value is outside the parsed base range; bucket differs) |
| The Furnace, damage to Elites | 75–200 [x] | 75–100 [x] | same | no (range differs) |
| Tibault's Will, damage while Unstoppable | 26 [x] | 15–20 [x] | same | no (value is outside the parsed base range) |
| Melted Heart of Selig, Maximum Life | -75 none | 75 none | same | yes (same magnitude, opposite sign) |
| Ramaladni's Magnum Opus, Fury drain | 7 none | 7 none | same | yes |
| Ramaladni's Magnum Opus, per Fury | 0.35–0.5 [x] | 0.35–0.5 [x] | same | yes |
| Ring of Starless Skies, cap | 50 [x] | 50 [x] | same | yes |
| Ring of Starless Skies, one stack | 10 [x] | 10 [x] | same | yes |
| Splinter damage taken per soul | 1 none | 1 none | same | yes |
| Stone of Jordan, highest element | 23 [x] | 15–25 [x] | same | yes (roll sits inside the parsed base range) |
| Tibault's Will, Fury Regeneration | 25 none | 25 none | same | yes |
| Tuskhelm of Joritz the Mighty, Cooldown Reduction | 10 none | 10 none | same | yes |
| Tuskhelm of Joritz the Mighty, damage | 40–50 [x] | 40–50 [x] | same | yes |
| Tuskhelm of Joritz the Mighty, Fury per second | 6 none | 6 none | same | yes |

## Hand-entered lines with no parsed unique-power number

- Enigma: Teleport Primary Resource cost
- Melted Heart of Selig: Primary Resource
- Melted Heart of Selig: damage while above 50 Primary Resource
- Melted Heart of Selig: Vulnerable Damage Multiplier
- Melted Heart of Selig: Attack Speed and Critical Strike Chance
- Melted Heart of Selig: Fury cost
- Melted Heart of Selig: Fury Regeneration

## Aspects

Catalog aspects with a companion name match and a parsed Affix_Value line: 86 matched, 16 mismatched, 0 names did not match a parsed aspect. Codex ranks can sit outside the base roll, and that comparison uses the base formula only.

| Aspect | Our value | Parsed base | Parsed bucket | Note |
| --- | --- | --- | --- | --- |
| Raid Leader's Aspect | 7–10 | 3.9 + legendary rank | [x] | number missing |
| Aspect of Coagulation | 20–30 | 15 + legendary rank | none | number missing |
| Aspect of the Protector | 70–100 | 20 | none | range differs |
| Bruiser's Aspect | 154–230 | 4 | [+] | range differs; bucket differs |
| Enshrouding Aspect | 20–30 | 19 + legendary rank | [+] | number missing |
| Iron Blood Aspect | 20–30 | 19 + legendary rank | none | number missing |
| Aspect of Berserk Ripping | 40–60 | 39 + legendary rank | none | number missing |
| Cremator's Aspect | 45–65 | 45 + ((CurrentLegendaryRank()-1) * 2/3) | [x] | number missing |
| Wanton Rupture Aspect | 20–30 | 19 + legendary rank | [x] | number missing |
| Aspect of Booming Voice | 20–30 | 20+CurrentLegendaryRank()-1*1 | [+] | number missing |
| Blood Boiling Aspect | 21627–31215 | 4.5 + legendary rank | none | number missing |
| Overheating Aspect | 15–20 | 75 + legendary rank | [x] | number missing |
| Sticker-Thought Aspect | 1920–5760 | 1 + legendary rank | none | number missing |
| Wildbolt Aspect | 3.5–1.5 | 3.5-(CurrentLegendaryRank()-1)*0.1 | none | number missing |
| Aspect of Metamorphosis | 10–4 | 10-(CurrentLegendaryRank()-1)*0.5 | none | number missing |

