# MC-CartoLive 2.2 Live Confidence Roadmap

The 2.2 line keeps the public feature set stable and improves the core promise:
the public map should look live, accurate, and explainable.

## 2.2.0 - Live Confidence Baseline

- Classify packet ingest, public cache, routed pulse motion, observer burst
  motion, WebSocket, and DB readiness as separate operational states.
- Treat packet ingest as fresh only when MQTT packets are normally less than
  five seconds stale.
- Keep `/healthz` cheap and `/readyz` production-oriented without exposing
  private packet or broker details.

## 2.2.1 - Inclusion Diagnostics v2

- Expand `mc-diagnose` around coordinate and IATA truth.
- Report actual IATAs, public allowlist matches, coordinate status, mappability
  reason, and node/observer position source.
- Support `--iata`, `--name`, `--label`, and `--id` operator lookups.

## 2.2.2 - Always-Live Recovery

- Reconcile from public snapshots after reconnect without duplicating stale
  packet comets or packet counters.
- Keep stale-state diagnosis in logs/runbooks and local operator tools.
- Do not add public debug endpoints or outbound alert webhooks.

## 2.2.3 - Smoothness On Modest Systems

- Keep live queues bounded and paced so bursty traffic remains visible.
- Track browser-local diagnostics for live queue size, active comets, source
  updates, frame skips, VCR queue size, and hidden-tab pauses.
- Keep source updates batched and route/node signatures stable.

## 2.2.4 - Subtle Public Freshness Polish

- De-emphasize older known routes with restrained opacity changes.
- Avoid public freshness labels, extra panels, or noisy map chrome.
- Preserve VCR, live clock, palettes, Legend, route plotting, and mobile layout.

## 2.2.5 - Production Candidate Gate

- Gate releases with backend tests, frontend tests/build, Docker build,
  health/readiness, public state, history, WebSocket, VCR replay, and browser
  smoke checks.
- Require a 24h live soak before declaring the 2.2 line production-ready.
- Run privacy checks before tags.

## Non-Goals

- No major public map feature expansion in the 2.2 line.
- No public raw packet hashes, raw path hex, full public keys, resolver debug
  fields, private payloads, broker credentials, or operator config.
- No node/observer merging by display name.
