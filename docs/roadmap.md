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

## 2.3.2 - Perf Lab Tab

- Add a top-bar Perf tab for public-safe live confidence, backend pressure,
  WebSocket, queue, and browser-local render counters.
- Keep diagnostics browser-local or public-safe only; do not add telemetry or
  expose private packet/debug data.

## 2.3.3 - Diagnostic Snapshot Reports

- Add operator-only snapshot commands for IATA health, missing coordinates,
  stale observers, and label-vs-actual-IATA mismatches.
- Keep raw keys, packet hashes, raw hex, resolver debug details, and local
  config out of reports.
- Use snapshots to answer “why is this missing?” before changing map logic.

## 2.3.4 - Backup And Restore Rehearsal

- Add documented backup/restore rehearsal steps for SQLite WAL deployments.
- Verify the app can restart from restored `meshcore-live.db*` files.
- Keep restore tests operator-run only; do not mutate production data without an
  explicit maintenance window.

## 2.3.5 - Frontend Payload And Smoothness Pass

- Reduce the large frontend bundle with targeted code splitting where it is low
  risk.
- Preserve the current VCR, palette, Legend, route plotting, phonebook, and map
  animation behavior.
- Use browser-local performance counters to prove source rebuild and animation
  behavior do not regress.

## 2.3.6 - Production Candidate Gate

- Complete a 24h live soak with packet ingest normally under five seconds stale.
- Run backend tests, frontend tests/build, Docker build, release check, live
  smoke, diagnostic smoke, public history, WebSocket, and browser checks.
- Tag only after privacy regression checks and soak artifacts are reviewed.

## 2.4.0 - True Path Packets API Groundwork

- Add a public-safe packets endpoint backed only by persisted `live_edge_events`
  that already produced mappable public route segments.
- Define a true path packet as a routed packet with at least one valid public
  segment, public IATA allowance, sanitized labels, public route IDs, public
  endpoint coordinates, and no raw packet hash, raw path hex, full public key,
  resolver reason, raw payload, or broker metadata.
- Return stable cursor pagination over the same 24h history window used by VCR
  replay so the future Packets page can show only real routed packet paths.

## 2.4.1 - Packets Page v1

- Add a top-bar Packets tab with a clean CoreScope-style packet list focused on
  real paths: time, payload type, IATA, hop/segment count, distance, endpoint
  labels, and route preview.
- Keep the page viewer-first: newest packets are easy to scan, selecting a row
  highlights the exact public route segments on the map, and replaying a row
  feeds the existing comet animation path.
- Include filters for time window, IATA, payload type, minimum hops, and message
  payloads only when backed by sanitized public route events.

## 2.4.2 - Packet Explainability Diagnostics

- Extend local operator diagnostics so a packet can be explained as included,
  skipped for missing route segments, filtered by public IATA, invalid for map,
  stale/future-dated, or private-only.
- Keep these explanations local-only through scripts or `mc-diagnose`; do not
  add an unauthenticated public debug endpoint.

## 2.4.3 - Packets Page Performance And Mobile Polish

- Virtualize or window the packet list if needed, cap fetch sizes, and keep map
  source updates stable when the Packets tab is open.
- Make the page readable on 390px mobile without blocking the live map controls,
  VCR handle, or bottom-right live clock.

## 2.4.4 - Production Gate

- Verify backend tests, frontend tests/build, Docker build, live smoke,
  `/api/v1/public/packets`, VCR replay, WebSocket, desktop browser, and mobile
  browser checks before tagging.
- Run privacy regression checks against public state, history, packets,
  summary, WebSocket, health, and readiness responses.

## Non-Goals

- No broad public map feature expansion outside the documented 2.4 Packets page.
- No public raw packet hashes, raw path hex, full public keys, resolver debug
  fields, private payloads, broker credentials, or operator config.
- No public admin/debug page unless a later roadmap explicitly adds local-only
  access controls.
