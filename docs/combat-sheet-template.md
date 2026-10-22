# Combat sheet fields to read

The numbers stored today are town values, read off the character sheet in town. In combat, with buffs up, the same rows are higher. Leave every combat cell blank until those screenshots are in hand. Do not fill a cell from a guess.

`sheetContext` on the saved build stays `town`. The engine keeps using the town numbers, and the headline score stays the town score. After a combat number is entered on a field, set `sheetContext` to `combat`. The engine then uses each field's `combat` number. A field whose `combat` value is still empty uses that field's `town` number, and the result lists the fallback (`sheetFallbacks`, plus one note).

`currentFury` feeds Ramaladni (0.50%[x] per point of Fury). Both sides are empty. Until a combat reading is stored, the engine uses the resolved Max Fury and marks that default as an estimate.

All Damage is one row. Write it to both `additivePct` and `offensiveSheet.allDamage`. Vulnerable Damage is one row. Write it to both `vulnPct` and `offensiveSheet.vulnerable`. The items-and-Paragon split is the tooltip inside All Damage. Record it. The engine does not add it on top of All Damage.

The character `sheet` object stays the flat town archive (life, armor, weapon damage, strength, and the other attributes already stored there).

## Scored by the damage engine

| Field | Path | Town | Combat |
| --- | --- | ---: | --- |
| Weapon Damage | `weaponDmg` | 4596 | |
| Strength | `mainStat` | 4101 | |
| Critical Strike Chance | `critChance` | 100 | |
| Critical Strike Damage | `critDmg` | 7424.8 | |
| All Damage | `additivePct` and `offensiveSheet.allDamage` | 606.7 | |
| Vulnerable Damage | `vulnPct` and `offensiveSheet.vulnerable` | 208.8 | |
| Damage with Physical | `offensiveSheet.physical` | 250.5 | |
| Damage with Fire | `offensiveSheet.fire` | 120.5 | |
| Damage with Lightning | `offensiveSheet.lightning` | 90.5 | |
| Damage with Cold | `offensiveSheet.cold` | 134.3 | |
| Damage with Holy | `offensiveSheet.holy` | 90.5 | |
| Damage with Poison | `offensiveSheet.poison` | 90.5 | |
| Damage with Shadow | `offensiveSheet.shadow` | 90.5 | |
| vs Elites | `offensiveSheet.vsElites` | 133.5 | |
| vs Healthy | `offensiveSheet.vsHealthy` | 26 | |
| vs Injured | `offensiveSheet.vsInjured` | 26 | |
| while you are Healthy | `offensiveSheet.whileHealthy` | 223.2 | |
| while Fortified | `offensiveSheet.whileFortified` | 35 | |
| Max Fury | `maxFury` | 826 | |
| Current Fury | `currentFury` | (empty; default is Max Fury, estimate) | |

Whirlwind scores the Physical row. The other element rows are stored and score when the selected skill's element is that row. Thorns is stored at `offensiveSheet.thorns` town 0. Read it if the combat sheet shows a Thorns row.

## Used for effective life

| Field | Path | Town | Combat |
| --- | --- | ---: | --- |
| Life | `defense.life` | 473 | |
| Armor | `defense.armor` | 33715 | |
| Armor mitigation % | `defense.armorMitigationPct` | 78.2 | |
| Resistances | `defense.resists` | 21218 | |
| Resist mitigation % | `defense.resistMitigationPct` | 85.9 | |
| All Damage Reduction | `defense.dr` | 50 | |

All Damage Reduction stays a list, `[50]`, until a combat reading is stored. The mitigation cap `defense.mitigationCapPct` is 90 and is the cap, not a buffed sheet row.

## Record only

These town numbers are already on the build or in the defence-sheet note. The damage score does not multiply by them. Read the combat row anyway so the next pass can store it.

| Field | Path | Town | Combat |
| --- | --- | ---: | --- |
| All Damage from items and Paragon | `offensiveSheet.allDamageItemsAndParagon` | 316.5 | |
| Thorns | `offensiveSheet.thorns` | 0 | |
| Fury regeneration | `furyRegeneration` | 85 | |
| Fury generation % | `furyGenerationPct` | 52.5 | |
| Fury cost reduction % | `furyCostReductionPct` | -30 | |
| Fury on kill | `furyOnKill` | 11 | |
| Cold resistance from gear | `defense.coldResistance.gear` | 18947 | |
| Cold resistance from Intelligence | `defense.coldResistance.intelligence` | 629 | |
| Cold resistance, other | `defense.coldResistance.other` | 1642 | |
| Intelligence | `sheet.intelligence` | 981 | |
| Willpower | `sheet.willpower` | 1333 | |
| Dexterity | `sheet.dexterity` | 1320 | |
| Toughness | `sheet.toughness` | 25600 | |
| Healing received % | defence-sheet note | 67.7 | |
| Life regeneration | defence-sheet note | 276 | |
| Attack speed bonus % | defence-sheet note | 100 | |
| Movement speed % | defence-sheet note | 200 | |
| Weapon speed | defence-sheet note | 1.10 | |

Intelligence, Willpower, Dexterity, and Toughness are the flat town archive on `sheet`. Healing received, life regeneration, attack speed, movement speed, and weapon speed are in that same note and do not have a `combat` field yet. Write the combat number in this table when the screenshot is read.
