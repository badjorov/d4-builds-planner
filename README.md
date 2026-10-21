# D4 build planner — Barbarian first (Season 15, patch 3.2.1)

Local static app. Not affiliated with Blizzard. The calculator is the v0 damage sheet. The optimizer is milestone 1: a class-agnostic search that currently loads the Barbarian catalog.

## Run

`python3 -m http.server 8080` in this folder (or `npm start`).

- Calculator: http://localhost:8080/
- Optimizer: http://localhost:8080/optimizer.html
- Data entry and the needs-input list: http://localhost:8080/data-entry.html

Tests: `npm test` (Node built-in runner, no dependencies). The script passes `test/*.test.js` so Node 20 and Node 22 both run the files. `npm run needs-input` prints every null, unverified flag, roll range, and empty collection in `data/barbarian.json`.

## Data sourcing rules

Only official Blizzard pages and manual entry from your own game client. No datamines, no client reading, and no copying from Maxroll, Mobalytics, Icy Veins, Wowhead, or d4builds. Never invent numbers: unknown stays `null`, and `verified` stays false until the exact value is in the source.

Search tests use invented numbers only in `test/fixtures/`, and those files are marked `SYNTHETIC`.

Sources cited by the catalog:

| Source | What it is used for | License |
| --- | --- | --- |
| https://news.blizzard.com/en-us/article/24295394/celebrate-30-years-of-diablo-in-season-of-hell-s-legacy | Patch 3.2.1 numbers migrated from v0 | © Blizzard Entertainment. Official patch notes. Not an open-license dataset. |
| https://news.blizzard.com/en-us/article/24292852/the-3-2-0-ptr-what-you-need-to-know | 3.2.0 PTR notes migrated from v0 | © Blizzard Entertainment. Official PTR notes. Not an open-license dataset. |
| https://news.blizzard.com/en-us/article/23189677/diablo-iv-feature-overview | The statement that Barbarians carry four weapons. Slot ids are still unverified planner labels. | © Blizzard Entertainment. Official feature overview. Not an open-license dataset. |

No open-license game dataset is included. If you add one later, list its URL and license in this table and in `meta.sources`.

## Catalog

`data/schema/catalog.schema.json` is the class catalog. `data/barbarian.json` is the migrated v0 data. `data/schema/build.schema.json` is a build: skills, 13 gear slots (affixes plus one aspect or one unique), and empty stubs for boards, glyphs, and talismans. `data/meta-builds.json` is the novelty comparison file. It ships with one row named `EXAMPLE — not a real build`. That row is ignored. Fill in your own builds.

Each effect has a stat or damage bucket, a point value or a `[min, max]` roll range, conditions, a stacking rule, a source, and a verified flag. All of those are null when the notes do not say them. `src/schema.js` checks the subset of JSON Schema used by those files.

Constraints live in the catalog: skill-bar size (null until a source states it), one aspect per slot, and uniques fixed to a sourced slot list. A unique with `slots: null` cannot be equipped. Playability minimums in the file are null, so they reject nothing until you set them on the optimizer page or in `checkBuild`.

## What the optimizer does

1. Enumerate skill cores whose tags match the filter, up to the skill-bar size or the core-size limit.
2. Rank aspects and uniques by `marginal()` from `src/engine.js` (marginal percent of a bucket times the item's point value), place them greedily, then run a beam search. The kept loadout is the higher of the two. Items with a null point value, an unknown condition, or a unique slot of null are not placed. Paragon, glyphs, boards, and talismans are not searched.
3. Reject a build that breaks slot constraints or misses a minimum you set. Fury sustain is generation per second minus spend per second for the rotation. Berserk, Vulnerable, and Overpower uptime are fractions you enter (0–1). EHP is `life / ((1 - armor mitigation) × (1 - resist mitigation) × Π(1 - DR))` using mitigation percents you read off the character sheet. Armor and resist ratings are not converted, because that curve is not in the sourced data.
4. Novelty is the distance to the nearest non-example row in `data/meta-builds.json`: the average of Jaccard distance (skills, aspects, uniques, key items) and normalized bucket-profile distance. With no real meta rows, novelty is 1. Rank is power × novelty, after a power floor. Fully verified builds are the default. The unverified-data toggle shows the rest, each with its unverified share. The page lists up to 20 and prints the engine's why breakdown.

Manual weapon, main stat, and crit inputs count as unverified until you check that you verified them in game. Checking the box does not create a source.

## Editing data

Use the data-entry page, or edit `data/barbarian.json` directly. Export from the page and replace the file. Set `verified: true` only after the exact value is in an official source, and keep the source URL on the entity and the effect.

The v0 calculator still evaluates a build with the same buckets: base × (1+Σadd) × Π(1+mult) × (1+Str/10×scalar) × (1+CC×CD) × (1+vuln) × (1+OP). DoT skips crit. Bucket names ending in `?` are not used until you confirm them. Builds and votes stay in localStorage.
