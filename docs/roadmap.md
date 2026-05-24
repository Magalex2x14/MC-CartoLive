# MC-CartoLive 2.3 Operator Confidence Roadmap

The 2.3 line keeps public map features stable and improves operator confidence:
release checks should be repeatable, live soaks should produce evidence, and
missing-data investigations should be easy to run from the production host.

## 2.3.0 - Release And Soak Automation Baseline

- Add repeatable soak scripts for local or droplet validation.
- Record health, readiness, public state, packet totals, live-confidence states,
  and history availability over time.
- Keep output local as JSON/NDJSON artifacts; do not add telemetry or public
  diagnostic endpoints.

## 2.3.1 - Live Droplet Smoke Automation

- Make the production smoke path a single documented command after deploy.
- Verify `/healthz`, `/readyz`, public state, public history, WebSocket connect,
  and bundled `mc-diagnose`.
- Include explicit checks for version, git SHA, build time, packet count, and
  `packetIngestState=fresh` under live traffic.

## 2.3.2 - Diagnostic Snapshot Reports

- Add operator-only snapshot commands for IATA health, missing coordinates,
  stale observers, and label-vs-actual-IATA mismatches.
- Keep raw keys, packet hashes, raw hex, resolver debug details, and local
  config out of reports.
- Use snapshots to answer “why is this missing?” before changing map logic.

## 2.3.3 - Backup And Restore Rehearsal

- Add documented backup/restore rehearsal steps for SQLite WAL deployments.
- Verify the app can restart from restored `meshcore-live.db*` files.
- Keep restore tests operator-run only; do not mutate production data without an
  explicit maintenance window.

## 2.3.4 - Frontend Payload And Smoothness Pass

- Reduce the large frontend bundle with targeted code splitting where it is low
  risk.
- Preserve the current VCR, palette, Legend, route plotting, phonebook, and map
  animation behavior.
- Use browser-local performance counters to prove source rebuild and animation
  behavior do not regress.

## 2.3.5 - Production Candidate Gate

- Complete a 24h live soak with packet ingest normally under five seconds stale.
- Run backend tests, frontend tests/build, Docker build, release check, live
  smoke, diagnostic smoke, public history, WebSocket, and browser checks.
- Tag only after privacy regression checks and soak artifacts are reviewed.

## Non-Goals

- No major public map feature expansion in the 2.3 line.
- No public raw packet hashes, raw path hex, full public keys, resolver debug
  fields, private payloads, broker credentials, or operator config.
- No public admin/debug page unless a later roadmap explicitly adds local-only
  access controls.
