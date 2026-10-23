# Combat sheet fields

The saved build stays on `sheetContext: town`. The town headline uses the town numbers. `combat-nobuff` and `combat-allbuff` are a video-model reading from 2026-10-23. That reading is unconfirmed. Each stored combat number carries `sources` text `video-model reading 2026-10-23, unconfirmed`. A blank cell below is still empty. The engine falls back and lists the fallback.

`sheetContext` selects the reading: `town`, `combat`, `combat-nobuff`, or `combat-allbuff`. A bare number is a town reading. `combat` falls back to town. `combat-nobuff` falls back to town. `combat-allbuff` uses its own number, then `combat-nobuff`, then town. `allbuffEndpoint: high` reads `combat-allbuff-high` where that number is stored. All Damage is the only ramp stored that way: 1,996% at the low end and 9,897.7% at the high end, about 14 seconds, likely the Wrath ramp.

`currentFury` on both combat contexts is 826, observed, because the Fury globe stays full. The town context is still empty, so the town score still defaults to Max Fury and marks that default as an estimate. Ramaladni is 0.50%[x] per point either way at 826.

All Damage is one row. It is stored on both `additivePct` and `offensiveSheet.allDamage`. Vulnerable Damage is one row, stored on both `vulnPct` and `offensiveSheet.vulnerable`. The items-and-Paragon split is the tooltip inside All Damage. The engine does not add it on top of All Damage.

Attack speed is stored and is not a per-hit damage multiplier. Polearm Expertise is already 10/10 in the catalog. The combat video reads the same rank. The Leoric skull icon shows no stack count, so the per-soul rate stays applied once. A weapon tooltip read as "Deathhead of Channeling" (1H mace, uncertain) listed +21 Damage Multiplier, 150%[x] all damage, and +114% damage. The equipped item is Deathshead of Channeling, a 2H mace, with Aspect of Channeling at 138%[x] [100-140], x25% All Damage Multiplier, and x88% Critical Strike Damage Multiplier. None of those three tooltip lines match, so `combatObservations.weaponTooltip.applied` is false.

## Scored by the damage engine

| Field | Path | Town | combat-nobuff | combat-allbuff |
| --- | --- | ---: | ---: | ---: |
| Weapon Damage | `weaponDmg` | 4596 | | |
| Strength | `mainStat` | 4101 | | |
| Critical Strike Chance | `critChance` | 100 | 100 | 100 |
| Critical Strike Damage | `critDmg` | 7424.8 | 10819.5 | 10819.5 |
| All Damage | `additivePct` and `offensiveSheet.allDamage` | 606.7 | 1755.2 | 1996, high 9897.7 |
| Vulnerable Damage | `vulnPct` and `offensiveSheet.vulnerable` | 208.8 | 2836.8 | 2836.8 |
| Damage with Physical | `offensiveSheet.physical` | 250.5 | 250.5 | 250.5 |
| Damage with Fire | `offensiveSheet.fire` | 120.5 | | |
| Damage with Lightning | `offensiveSheet.lightning` | 90.5 | | |
| Damage with Cold | `offensiveSheet.cold` | 134.3 | | |
| Damage with Holy | `offensiveSheet.holy` | 90.5 | | |
| Damage with Poison | `offensiveSheet.poison` | 90.5 | | |
| Damage with Shadow | `offensiveSheet.shadow` | 90.5 | | |
| vs Elites | `offensiveSheet.vsElites` | 133.5 | 94.1 | (falls back to 94.1) |
| vs Healthy | `offensiveSheet.vsHealthy` | 26 | 181.8 | (falls back to 181.8) |
| vs Injured | `offensiveSheet.vsInjured` | 26 | 133.4 | (falls back to 133.4) |
| while you are Healthy | `offensiveSheet.whileHealthy` | 223.2 | 308.2 | (falls back to 308.2) |
| while Fortified | `offensiveSheet.whileFortified` | 35 | 367.5 | (falls back to 367.5) |
| while Berserking | `offensiveSheet.whileBerserking` | | 247.9 | (falls back to 247.9) |
| Overpower Damage | `offensiveSheet.overpowerDamage` | | 6432.2 | (falls back to 6432.2) |
| Max Fury | `maxFury` | 826 | | |
| Current Fury | `currentFury` | (empty; default is Max Fury, estimate) | 826 observed | 826 observed |

Whirlwind scores the Physical row. The other element rows are stored and score when the selected skill's element is that row. Thorns stays `offensiveSheet.thorns` town 0.

vs Healthy and vs Injured are separate rows in combat. The town pair is still 26 and 26, so the town score keeps one shared Healthy-or-Injured window. while Berserking applies while `uptime.berserk` is above 0. Overpower Damage 6,432.2% is the factor on an Overpower hit in a combat context (`1 + 6432.2/100`). The town stack total stays 104% on the town context.

The lower combat-allbuff rows were not visible in the video. They are stored empty and fall back to combat-nobuff, and the result lists that fallback.

## Used for effective life

| Field | Path | Town | Combat |
| --- | --- | ---: | --- |
| Life | `defense.life` | 473 | |
| Armor | `defense.armor` | 33715 | |
| Armor mitigation % | `defense.armorMitigationPct` | 78.2 | |
| Resistances | `defense.resists` | 21218 | |
| Resist mitigation % | `defense.resistMitigationPct` | 85.9 | |
| All Damage Reduction | `defense.dr` | 50 | |

All Damage Reduction stays a list, `[50]`, until a combat reading is stored. The mitigation cap `defense.mitigationCapPct` is 90 and is the cap.

## Record only

These numbers are on the build or in the defence-sheet note. The damage score does not multiply by them.

| Field | Path | Town | combat-nobuff | combat-allbuff |
| --- | --- | ---: | ---: | ---: |
| All Damage from items and Paragon | `offensiveSheet.allDamageItemsAndParagon` | 316.5 | | |
| Thorns | `offensiveSheet.thorns` | 0 | | |
| Attack speed bonus % | `attackSpeed` | (defence-sheet note 100; `attackSpeed.town` empty) | 120 | 120 |
| Fury regeneration | `furyRegeneration` | 85 | | |
| Fury generation % | `furyGenerationPct` | 52.5 | | |
| Fury cost reduction % | `furyCostReductionPct` | -30 | | |
| Fury on kill | `furyOnKill` | 11 | | |
| Cold resistance from gear | `defense.coldResistance.gear` | 18947 | | |
| Cold resistance from Intelligence | `defense.coldResistance.intelligence` | 629 | | |
| Cold resistance, other | `defense.coldResistance.other` | 1642 | | |
| Intelligence | `sheet.intelligence` | 981 | | |
| Willpower | `sheet.willpower` | 1333 | | |
| Dexterity | `sheet.dexterity` | 1320 | | |
| Toughness | `sheet.toughness` | 25600 | | |
| Healing received % | defence-sheet note | 67.7 | | |
| Life regeneration | defence-sheet note | 276 | | |
| Movement speed % | defence-sheet note | 200 | | |
| Weapon speed | defence-sheet note | 1.10 | | |

Observed hits from the same video, stored on `combatObservations.observedHits`: no buffs typically 20–80B with a max about 140–144B; all buffs typically 150–400B, peaks 461B and 507B, and 841B on an Overpower crit. The comparison with the model is in `docs/damage-audit.md`.
