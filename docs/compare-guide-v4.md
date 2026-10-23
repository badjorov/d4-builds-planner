# Whirlwind guide variant 4 vs Nikolay's build

The guide is the recorded row `ww-d4builds-immortal-speed-130` in `data/meta-builds.json`. Source: https://d4builds.gg/builds/whirlwind-barbarian-endgame/?var=4. Author Rob2628, updated 2026-10-12, recorded 2026-10-21. That row is names and the link. This comparison uses those recorded names.

The four guide uniques are manual entries from `d4-guide-uniques.md` (Research Scout), Season 15, patch 3.2.3. The note's source URLs were not in the workspace, so no URL is invented. Each value is an estimate and stays unverified.

The score uses the locked defaults. Souls use the sum `1 + rate × souls`. Nikolay's rate is 4.1%[x]. The guide rate is 2.5%[x], because Tuskhelm does not count as jewelry and the splinter is not gem-boosted. `overpowerSheetMeaning` is `total`. `critAudit.reading` is `headline`. Those defaults are calibrated against the 718B boss-dummy hit at 30 souls (peak 784B with the Burning line, 653B without it; average 341B). Both builds use the combat-allbuff sheet and the same 60s buff timeline. The peak is the full overlap on the high end of the All Damage ramp. The sustained average weights that timeline. The guide states no sheet, so both rows use Nikolay's sheet.

Min uses Starless 10%[x], Tuskhelm 40, Blood-Mad Idol 75, and The Furnace 75. Max uses Starless 50%[x], Tuskhelm 50, Blood-Mad Idol 150, and The Furnace 200. The additive readings move the Tuskhelm and Blood-Mad Idol percents into the additive pool. Starless and The Furnace stay [x].

## Scores

| Reading | Souls | Peak | Sustained average |
| --- | ---: | ---: | ---: |
| Nikolay | 15 | 567.86B | 247.29B |
| Nikolay | 30 | 784.11B | 341.46B |
| Guide min | 15 | 1,853.81B | 790.41B |
| Guide min | 30 | 2,359.39B | 1,005.98B |
| Guide max | 15 | 6,633.02B | 2,639.58B |
| Guide max | 30 | 8,442.03B | 3,359.47B |
| Guide additive min | 15 | 759.42B | 324.24B |
| Guide additive min | 30 | 966.53B | 412.67B |
| Guide additive max | 15 | 1,780.02B | 710.05B |
| Guide additive max | 30 | 2,265.49B | 903.70B |

On the full guide loadout, the 30-soul peak runs from ×3.0090 at the min reading to ×10.7664 at the max reading. The additive readings are ×1.2326 and ×2.8893. The sustained average runs from ×2.9461 to ×9.8385, and the additive average readings are ×1.2085 and ×2.6466.

At the peak every compared line is on, so the [x] peak is the product of the isolated peak factors. The average is not that product. Blood-Mad Idol keeps Berserk on outside the War Cry and Wrath windows, which also keeps the Tuskhelm line on, and The Furnace average uses the stored elite share. The additive readings join the combat-allbuff pool, so 40 to 150 additive is a small change beside All Damage and Overpower Damage.

## Per-slot diff

The multiplier is the 30-soul score after that one change, divided by Nikolay's score. A factor below 1 means his item scores higher on that reading. Helm includes the unboosted soul rate and the 10% Cooldown Reduction. The charm rows are isolated. The other gear slots stay ×1.0000.

| Slot | Nikolay | Guide | Peak min | Peak max | Peak additive min | Peak additive max | Average min | Average max | Average additive min | Average additive max |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Helm | Leoric's Crown | Tuskhelm of Joritz the Mighty | ×1.0987 | ×1.1771 | ×0.7857 | ×0.7860 | ×1.1944 | ×1.2779 | ×0.8617 | ×0.8620 |
| Chest | Enigma | Enigma | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Gloves | Gohr's Devastating Grips | Gohr's Devastating Grips | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Pants | Tibault's Will | Tibault's Will | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Boots | Earthstriker's Aspect | Earthstriker's Aspect | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Amulet | Melted Heart of Selig | Melted Heart of Selig | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Ring 1 | Stone of Jordan | Ring of Starless Skies (Ring 2) | ×0.8943 | ×1.2195 | ×0.8943 | ×1.2195 | ×0.8943 | ×1.2195 | ×0.8943 | ×1.2195 |
| Ring 2 | Crushing Aspect | Crushing Aspect (Ring 1) | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| 2H Slashing | Insight | Insight | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| 2H Bludgeoning | Aspect of Channeling | Aspect of Channeling (2H Mace) | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Dual wield 1 | Spirit | Spirit (1H Mace) | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Dual wield 2 | Ramaladni's Magnum Opus | Ramaladni's Magnum Opus | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 | ×1.0000 |
| Charm | — | Blood-Mad Idol (charm) | ×1.7500 | ×2.5000 | ×1.0024 | ×1.0048 | ×1.7508 | ×2.5011 | ×1.0038 | ×1.0071 |
| Charm | — | The Furnace (charm) | ×1.7500 | ×3.0000 | ×1.7500 | ×3.0000 | ×1.5625 | ×2.5000 | ×1.5625 | ×2.5000 |

Crushing Aspect is on both builds. The guide lists it on ring 1 and Ring of Starless Skies on ring 2. Nikolay lists Stone of Jordan on ring 1 and Crushing Aspect on ring 2. The scored swap keeps Crushing Aspect and replaces Stone of Jordan.

Notes on the rows that need one:

- Helm: Tuskhelm replaces Leoric's Crown. The helm is not jewelry, so this row uses the unboosted 2.5%[x] per soul. The 10% Cooldown Reduction multiplies the remaining cooldown after the sheet 39.4%. The [40-50]%[x] line is on for the all-buff peak and follows War Cry or Wrath on the average. That Berserk match is an estimate. The additive columns move the same percents into the additive pool.
- Ring 1: Ring of Starless Skies spends Primary Resource for 10%[x] damage for 3s, up to 50%[x]. Whirlwind channels constantly, so the min column is one stack and the max column is the cap. Stack uptime is an estimate. The resource-cost amount is null. The line removed with Stone of Jordan is 23%[x] damage of the highest element.
- 2H Bludgeoning: The guide names Aspect of Channeling on a 2H mace. Nikolay's item is Deathshead of Channeling, a 2H mace, with that aspect. The Furnace is also a 2H mace, and the recorded guide lists it as a charm, so this weapon stays Aspect of Channeling.
- Dual wield 1: The guide names Spirit as a 1H mace. Nikolay's stored Spirit is a 1H sword. No separate mace damage number is stored, so the score uses the same unique.
- Blood-Mad Idol: Always Berserking, so the guide row and this isolated charm keep Berserk on for the whole timeline. The additional damage uses min 75 and max 150. Low confidence. The 200%[x] self-burn is damage taken over 8s and is not scored. Burning on the player does not turn on the vs Burning target line. The additive columns move 75 and 150 into the additive pool.
- The Furnace: The Furnace is a 2H mace. The catalog slot is weapon-2. The recorded guide lists it as a charm and keeps Aspect of Channeling on 2H Bludgeoning, so it does not replace a weapon. Min 75 and max 200, low confidence. The peak uses elite 1. The average weights the percent by the stored elite share 0.75.

## Guide items he is missing

- Tuskhelm of Joritz the Mighty (Helm)
- Ring of Starless Skies (Ring 2 on the guide)
- Blood-Mad Idol (charm)
- The Furnace (charm)

## Which side scores higher

Isolated 30-soul factors below 1 mean his side scores higher on that reading.

- Leoric's Crown against Tuskhelm of Joritz the Mighty: peak ×1.0987 to ×1.1771, average ×1.1944 to ×1.2779. The additive peak is ×0.7857 and ×0.7860.
- Stone of Jordan against Ring of Starless Skies: peak ×0.8943 to ×1.2195, average ×0.8943 to ×1.2195.
- Blood-Mad Idol is not on his build. Adding it multiplies the peak by ×1.7500 to ×2.5000 and the average by ×1.7508 to ×2.5011. The additive peak is ×1.0024 to ×1.0048.
- The Furnace is not on his build. Adding it multiplies the peak by ×1.7500 to ×3.0000 and the average by ×1.5625 to ×2.5000.

His other choices are not on the guide. They do not change this score:

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
- Nikolay's row keeps the screenshot soul rate 4.1%[x], sum model. The guide helm is Tuskhelm, which does not count as jewelry, so the guide row uses the unboosted 2.5%[x] per soul. That guide rate is an estimate.
- Tuskhelm's 10% Cooldown Reduction multiplies the remaining cooldown after sheet 39.4% on any row that equips that helm. It is not inside Nikolay's sheet. Estimate.
- Changed slots do not receive the replaced item's affixes. No roll is invented. Starless, Tuskhelm, Blood-Mad Idol, and The Furnace use the ranges stored from d4-guide-uniques.md.
- Starless stack uptime is an estimate. The tooltip is high confidence: 10%[x] for 3s, up to 50%[x]. The resource-cost amount stays null.
- Tuskhelm's Berserk line is on for the all-buff peak. The average follows War Cry or Wrath unless Blood-Mad Idol forces Berserk on for the whole timeline. That uptime is an estimate. 6 Fury per second is not converted into damage.
- Blood-Mad Idol's additional damage uses min 75 and max 150 because the sources conflict. Low confidence. The 8s self-burn has no refresh interval, so the line is on for the whole window. That is an estimate. The 200%[x] is damage taken and does not turn on the vs Burning target line.
- The Furnace average uses elite share 0.75, an estimate. The boss-dummy peak uses elite 1. The recorded guide places The Furnace on the charm list, not in the 2H Bludgeoning slot.
- Patch 3.1 notes say some while-Berserking [x] bonuses were additive, and the items were not named. The additive columns score Tuskhelm and Blood-Mad Idol in the additive pool. Starless and The Furnace stay [x].
- Leoric's Crown database ranges of 35-50 or 75-100 are recorded on the gem note. The screenshot +65%[x] stays the stored boost.
- The guide names Spirit as a 1H mace. Nikolay's stored Spirit is a 1H sword. No separate mace damage number is stored.
- The four unique entries cite d4-guide-uniques.md. The note's source URLs were not in the workspace, so no URL is invented. Season 15, patch 3.2.3. Verified stays false.

