# D4 Barbarian Builds — internal v0 (Season 15, patch 3.2.1)
Local-only static app. Not affiliated with Blizzard.
## Run
`python3 -m http.server 8080` in this folder (or `npm start`), open http://localhost:8080. Tests: `npm test` (Node 20+, no deps).
## Data sourcing rules
Only official Blizzard patch notes/pages (news.blizzard.com) and manual entry from your own game client/tests. No datamines, scraping of Maxroll/Mobalytics/etc., client reading. Never invent numbers: unknown = `null`.
Every entry has `source` (URL or `manual-entry`) and `verified` (true only when the exact value is stated in an official source; bucket assignments still follow the community model → VERIFY in game).
## Editing data
Edit `data/barbarian.json`. Fields: `id, name, value|coeffPct, min/max (roll range), bucket (additive|multiplicative|crit|vuln|overpower|mainstat|special|none; '?' suffix = unsure), condition, source, verified, note`. Set `verified:true` after confirming in game and add a note (e.g. dummy test). `special`/`none` entries are shown but not calculated.
## Engine
`src/engine.js`: base × (1+Σadd) × Π(1+mult) × (1+Str/10×scalar) × (1+CC×CD) × (1+vuln) × (1+OP). DoT: no crit (VERIFY). "why?" shows each term; marginal table shows +1% per bucket.
Builds and confirm/debunk votes + notes live in localStorage; export/import JSON.
