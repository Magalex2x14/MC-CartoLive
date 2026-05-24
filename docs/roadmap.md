# MC-CartoLive 2.1 Reliability Roadmap

The 2.1 line is feature-frozen. Patch releases after 2.1.0 harden the same
public map so it always looks live, accurate, and explainable.

## 2.1.6 - Data Integrity And Inclusion Diagnostics

- Centralize node and observer map-inclusion decisions.
- Explain hidden records with `missing_coords`, `zero_coords`,
  `outside_bounds`, `iata_filtered`, or `mappable`.
- Add a local operator diagnostic command for IATA/name/ID investigations.
- Keep diagnostics local; do not add a public debug API.

## 2.1.7 - Always-Live Recovery

- Keep WebSocket reconnects bounded and explicit.
- Reconcile from a fresh public snapshot after reconnect.
- Track public cache age, route-pulse age, observer-burst age, packet totals,
  and MQTT last-message age in public-safe health/readiness responses.

## 2.1.8 - Animation Smoothness Budget

- Preserve packet comet visibility during bursty live traffic.
- Keep replay/live schedulers generation-safe.
- Keep source updates batched and expose browser-local diagnostics only.

## 2.1.9 - SQLite And API Pressure Reduction

- Keep public state/history compatible.
- Add indexes only where live query paths benefit.
- Keep repeated VCR summary/history reads on bounded caches.

## 2.1.10 - Production Runbook And Release Gate

- Maintain a definitive operator runbook.
- Run backend tests, frontend tests/build, Docker build, health/readiness,
  public state, history, websocket, and browser smoke checks before release.
- Audit public JSON and WebSocket payloads for privacy regressions before tags.

## Non-Goals

- No new public map features in the 2.1 patch line.
- No public raw packet hashes, raw path hex, full public keys, resolver debug
  fields, private payloads, broker credentials, or operator config.
- No node/observer merging by display name.
