# Whirlwind guide variant 4 vs Nikolay's build

The guide is the recorded row `ww-d4builds-immortal-speed-130` in `data/meta-builds.json`. Source: https://d4builds.gg/builds/whirlwind-barbarian-endgame/?var=4. Author Rob2628, updated 2026-10-12, recorded 2026-10-21. That row is names and the link. This comparison uses those recorded names.

The score is the calibrated model. Souls use the sum `1 + 0.041 × souls`. `overpowerSheetMeaning` is `total`. `critAudit.reading` is `headline`. Those defaults are calibrated against the 718B boss-dummy hit at 30 souls (peak 784B with the Burning line, 653B without it; average 341B). Both builds use the combat-allbuff sheet and the same 60s buff timeline. The peak is the full overlap on the high end of the All Damage ramp. The sustained average weights that timeline. The guide states no sheet, so both rows use Nikolay's sheet.

## Scores

| Build | Souls | Peak | Sustained average |
| --- | ---: | ---: | ---: |
| Nikolay | 15 | 567.86B | 247.29B |
| Nikolay | 30 | 784.11B | 341.46B |
| Guide variant 4 | 15 | 461.68B | 201.05B |
| Guide variant 4 | 30 | 637.49B | 277.61B |

Replacing Nikolay's differing items with the guide's items multiplies the 30-soul peak by ×0.8130 and the sustained average by ×0.8130.

## Per-slot diff

The multiplier is the 30-soul score after that one slot takes the guide item, divided by Nikolay's score. A factor below 1 means his item scores higher. The same factor applies at 15 souls, because the changed line is a multiplier and the soul factor scales both rows together. Peak and average use the same factor when the line is on for the whole timeline.

| Slot | Nikolay | Guide | Multiplier |
| --- | --- | --- | ---: |
| Helm | Leoric's Crown | Tuskhelm of Joritz the Mighty | ×1.0000 |
| Chest | Enigma | Enigma | ×1.0000 |
| Gloves | Gohr's Devastating Grips | Gohr's Devastating Grips | ×1.0000 |
| Pants | Tibault's Will | Tibault's Will | ×1.0000 |
| Boots | Earthstriker's Aspect | Earthstriker's Aspect | ×1.0000 |
| Amulet | Melted Heart of Selig | Melted Heart of Selig | ×1.0000 |
| Ring 1 | Stone of Jordan | Ring of Starless Skies (Ring 2) | ×0.8130 |
| Ring 2 | Crushing Aspect | Crushing Aspect (Ring 1) | ×1.0000 |
| 2H Slashing | Insight | Insight | ×1.0000 |
| 2H Bludgeoning | Aspect of Channeling | Aspect of Channeling (2H Mace) | ×1.0000 |
| Dual wield 1 | Spirit | Spirit (1H Mace) | ×1.0000 |
| Dual wield 2 | Ramaladni's Magnum Opus | Ramaladni's Magnum Opus | ×1.0000 |

Crushing Aspect is on both builds. The guide lists it on ring 1 and Ring of Starless Skies on ring 2. Nikolay lists Stone of Jordan on ring 1 and Crushing Aspect on ring 2. The scored swap keeps Crushing Aspect and replaces Stone of Jordan.

Notes on the slots that need one:

- Helm: Tuskhelm is stored as a charm. Its damage line has no bucket, so the helm name adds no multiplier. Leoric's helm copy of the per-soul line is scored on the splinter, not on the helm.
- Ring 1: Ring of Starless Skies is a recorded name. The catalog has no effect for it, so no multiplier is invented. The scored line removed with Stone of Jordan is 23%[x] damage of the highest element.
- 2H Bludgeoning: The guide names Aspect of Channeling on a 2H mace. Nikolay's item is Deathshead of Channeling, a 2H mace, with that aspect.
- Dual wield 1: The guide names Spirit as a 1H mace. Nikolay's stored Spirit is a 1H sword. No separate mace damage number is stored, so the score uses the same unique.

## Guide items he is missing

- Tuskhelm of Joritz the Mighty (Helm)
- Ring of Starless Skies (Ring 2 on the guide)
- Blood-Mad Idol (charm)
- The Furnace (charm)

## His items that beat the guide

- Stone of Jordan (Ring 1) scores higher. Swapping it for the guide item multiplies the score by ×0.8130.

His other choices are not on the guide. They do not change this score:

- Leoric's Crown (Helm)
- Endurant Faith (charm)
- Seal of the Epiphany (charm)
- Tuskhelm of Joritz the Mighty (charm)

## Same choices

Skills are the same six: Whirlwind, War Cry, Challenging Shout, Rallying Cry, Wrath of the Berserker, and Iron Skin. They match.
Runes are Igni, Ohm, Bac, and Mot on both. They match.
Expertise is polearm on both. They match.
Paragon boards and glyphs match by name: Starting Board / Might; Warbringer / Twister; Decimator / Imbiber; Weapons Master / Marshal; Flawless Technique / Wrath. They match.

## Assumptions

- The guide states no affix rolls, glyph levels, or masterwork values. Where the item is the same, Nikolay's stored rolls are used. Assumption.
- Glyph levels stay Nikolay's stored levels: might 135, twister 135, imbiber 133, marshal 131, wrath 131. The guide states no glyph level. Assumption.
- Paragon nodes inside each board stay Nikolay's stored nodes. The recorded guide lists the board and the glyph only. Assumption.
- Both rows use Nikolay's combat-allbuff sheet, weapon damage, strength, and the 60s buff timeline. The guide states none of those numbers. Assumption.
- Both rows use the calibrated 4.1%[x] per soul on the sum model. That rate is Nikolay's Leoric gem chain. The guide helm is Tuskhelm and states no soul rate. Keeping 4.1 on the guide row is an assumption so both rows share the calibrated model.
- Changed slots do not receive the replaced item's affixes. No roll is invented for Ring of Starless Skies, Blood-Mad Idol, or The Furnace.
- Tuskhelm's stored charm lines have no damage bucket. Placing that name on the helm adds no multiplier.
- The guide names Spirit as a 1H mace. Nikolay's stored Spirit is a 1H sword. No separate mace damage number is stored.

