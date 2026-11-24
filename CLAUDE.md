# CLAUDE.md

This file guides Claude Code when working in this repository.

## Important: where the code is

`main` contains only `README.md` (and this file). All the application code
lives on **unmerged branches** created by Cursor agents:

| Branch | Content |
|---|---|
| `cursor/import-d4-barb-builds-8e46` | v0: data, engine, tests, calculator UI |
| `cursor/build-optimizer-m1-8e46` | + milestone 1 optimizer, data entry, schemas |
| `cursor/catalog-batch2-8e46` | + codex, rotation, compare-guide, calibration docs |
| `cursor/import-game-data-8e46` | + `data/datamined/` and `scripts/import-d4data.mjs` |
| `cursor/s16-builds-8e46` | newest; contains all of the above + Season 16 builds and gear guide |

Each branch builds on the previous one. Before changing code, ask Nikolay which
branch to work on. Do not merge any of them into `main` without his OK.
The description below is of `cursor/s16-builds-8e46`.

## What this project is

A personal **Diablo IV build planner**, Barbarian first (Season 15/16,
patch 3.2.x). Not affiliated with Blizzard. Three pages:

- **Calculator** (`index.html`): the v0 damage sheet for the current build.
- **Optimizer** (`optimizer.html`): class-agnostic search over skill cores,
  aspects and uniques, scored by power × novelty against `data/meta-builds.json`.
- **Data entry** (`data-entry.html`): edit the catalog and see the
  "needs-input" list of missing values.

The full rules (damage formula, buckets, uptimes, data-sourcing rules) are in
the branch's `README.md`. Read it before touching the engine or data.

## Tech stack

- Static HTML + vanilla ES modules (`"type": "module"`). No framework, no
  bundler, **no npm dependencies**.
- Tests: Node's built-in test runner (`node --test`), Node 20 or 22.
- Data: JSON files validated by a small in-house JSON-Schema subset
  (`src/schema.js`).
- Saved builds and votes in the browser live in `localStorage`.

## How to run / deploy

- `npm start` (= `python3 -m http.server 8080`), then open
  http://localhost:8080/, `/optimizer.html`, `/data-entry.html`.
  On Windows, `python -m http.server 8080` if `python3` is missing.
- `npm test` runs `test/*.test.js`.
- `npm run needs-input` lists missing data in three tiers.
- **No deployment.** It is a local app; no GitHub Pages or hosting was found.

## File structure (s16 branch)

- `src/engine.js` — damage/EHP scoring and `marginal()`; core of everything.
- `src/search.js`, `src/constraints.js`, `src/novelty.js` — optimizer.
- `src/codex.js`, `src/rotation.js`, `src/attack-speed.js`, `src/masterwork.js`,
  `src/sheet-context.js`, `src/compare-guide.js`, `src/d4data-formula.js` —
  game-mechanic helpers.
- `src/app.js`, `src/optimizer-app.js`, `src/data-entry-app.js`, `src/html.js`,
  `src/ui.css` — page code.
- `data/barbarian.json` — hand-entered catalog. `data/builds.json` — saved
  builds including Nikolay's current build. `data/meta-builds.json`,
  `data/s16-builds.json`, `data/skill-rank-bonus.json`.
- `data/schema/*.schema.json` — schemas. `data/datamined/` — parsed game data
  (see `data/NOTICE`).
- `scripts/needs-input.js`, `scripts/import-d4data.mjs`.
- `docs/` — damage audit, combat-sheet template, guide comparisons, S16 notes.
- `test/` — tests; `test/fixtures/` holds **synthetic** numbers only.

## Risky areas

- **Data sourcing rules** (README): never invent numbers; unknown stays
  `null`; `verified` stays `false` until the exact value is in a source.
  Do not copy numbers from Maxroll, Mobalytics, Icy Veins, Wowhead or d4builds.
- The README says "no datamines", yet `data/datamined/` exists on the later
  branches as a separate, labelled store. Keep the two stores apart and never
  overwrite hand-entered values in `data/barbarian.json` with parsed ones.
- `data/NOTICE` says the parsed game data is "not for redistribution", while
  this GitHub repo is **public**. Raise it with Nikolay before pushing more of it.
- `data/builds.json` holds Nikolay's real character. The calibrated defaults
  (soul model `sum`, `overpowerSheetMeaning` `total`, `critAudit.reading`
  `headline`) are locked on purpose.
- Engine changes shift every score; run `npm test` after any change.

## Live vs. test copy

- There is no live deployment and no other users. The "live" data is
  `data/builds.json` / `data/barbarian.json` on the branch Nikolay uses.
- Test on a new branch; run `npm test` and the local server before asking to
  merge. Pushing and merging branches still need Nikolay's OK.

## Google Apps Script

None in this project.
