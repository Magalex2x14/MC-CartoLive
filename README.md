# MeshCore MQTT Live Map v2.4.0

Also known as **MC-CartoLive**.

MC-CartoLive is a Dockerized live MQTT-to-map dashboard for MeshCore public RF
observations. It ingests MeshCore broker traffic, resolves only
high-confidence RF routes, and serves a smooth public MapLibre dashboard with
live packet motion, observer activity, decoded public message bubbles, and
privacy-safe public APIs.

The app stays intentionally simple for operators: one Go backend, one embedded
React frontend, one SQLite database, one Docker Compose service.

Public Instances: 
Meshcore Canada MQTT - https://carto.canadaverse.org/

## Screenshots

Real public map data from the local production container:

![MC-CartoLive 2.1 feature collage](docs/assets/screenshots/mc-cartolive-2.1-share-collage.png)

The 2.1 view includes dark/light map modes, OpenFreeMap 3D, route plotting,
node clusters, route focus, node details, phonebook routing, VCR replay, and
palette swatches.

![Canada cluster overview](docs/assets/screenshots/canada-clusters.png)

![Toronto live route detail](docs/assets/screenshots/toronto-detail.png)

![Ottawa live route detail](docs/assets/screenshots/ottawa-detail.png)

## What It Does

- Subscribes read-only to MeshCore MQTT packet and status topics.
- Decodes MeshCore packet and payload types needed for public map rendering.
- Resolves RF paths conservatively, without drawing guessed routes.
- Shows low-zoom role-split cluster activity and high-zoom route/node detail.
- Keeps routes, nodes, observer icons, packet effects, and message bubbles behind one shared detail zoom threshold so routes never appear without nodes.
- Shows ordinary node names on hover/details only, while observer names persist without noisy last-seen text.
- Greys stale nodes after 30 minutes and darkens them further after 60 minutes.
- Lets users select repeaters, observers, rooms, companions, or sensors to highlight directly served RF routes and connected nodes.
- Keeps route lines passive on the map so dense RF paths do not steal clicks from nodes.
- Optimizes dense route rendering for slower computers by avoiding unnecessary full route redraws and rendering live route glow only for active routes.
- Paces live websocket bursts so packet counters, observer bursts, and routed comets keep moving smoothly instead of arriving as one visual clump.
- Hardens WebSocket reconnects with bounded jitter/backoff and snapshot recovery so public map motion resumes after transient network drops.
- Separates packet-ingest freshness from routed/observer map motion so quiet route periods can be diagnosed without hiding a healthy MQTT feed.
- De-emphasizes older known routes subtly while keeping fresh routed traffic visually clear.
- Adds a searchable reachable-node phonebook that defaults to useful shortest-path routes first, can filter by distance, supports best/shortest/busiest/nearest/recent sorting, highlights a selected multi-hop path, and can copy MeshCore 3-byte route prefixes.
- Adds a Plot routes control for choosing two node endpoints or two map corners and highlighting matching public RF routes.
- Shows decoded public chatter history for the selected node when sanitized message text is available in the live window.
- Animates live packet comets, sustained observer activity aura, route payload glows, and message bubbles.
- Adds a hidden-by-default VCR playback surface for pausing live motion, replaying missed routed packet comets, scrubbing recent history, and replaying at 0.5x, 1x, 2x, or 4x.
- Keeps the VCR compact, clear of map controls, and paired with a bottom-right live pulse clock when closed.
- Adds hideable/snappable Search, compact Legend, and Busy Pathways panels with a top panel restore menu.
- Adds a top-bar Perf tab with public-safe live confidence, backend pressure, WebSocket, and browser-local map render counters.
- Adds public-safe true-path packet records backed only by persisted routed edge events for the upcoming detailed Packets page.
- Shows Busy Pathways as a compact last-15-minute packet-count list instead of a flow graph.
- Adds client-side dark/light mode and MeshCore Tower palette selection.
- Includes a transparent project bar with MeshCore Canada, GitHub stars/forks, linked version/build metadata, and build age.
- Provides a red Live Follow control for smoothly following areas with fresh packet movement.
- Prioritizes the map on mobile by hiding secondary panels/toasts and keeping the map, packet animations, live clock, and essential controls readable.
- Serves public state from a backend memory cache instead of rebuilding every request from SQLite.
- Adds cheap `/healthz` liveness and `/readyz` readiness checks with public-safe runtime counters for cache age, DB readiness, MQTT status, WebSocket drops, public history latency, and live-confidence states.
- Adds operator-only diagnostics for explaining why a node, observer, label, name, or IATA is or is not shown on the public map.
- Adds release, live smoke, and soak scripts so operators can capture repeatable local or droplet evidence before tagging.
- Caches public history location indexes and timeline summary buckets to reduce SQLite pressure from VCR replay and timeline polling.
- Batches frontend map source updates behind animation frames and pauses packet canvas work while the tab is hidden.
- Exposes opt-in browser-local performance counters for development without sending telemetry anywhere.
- Filters public traffic through the Canada IATA allowlist.
- Keeps private broker credentials, channel secrets, live DB files, packet hashes, full public keys, raw path hex, and resolver debug details out of public responses.
- Publishes only six-character MeshCore 3-byte route prefixes for route-copy workflows.

## Architecture

- Go HTTP API, WebSocket server, MQTT subscriber, route resolver, and SQLite persistence.
- React + Vite + TypeScript + MapLibre public dashboard.
- SQLite database at `/app/data/meshcore-live.db`, persisted through Docker volume or bind mount.
- Static frontend embedded into the Go binary during Docker build.

Public routes:

```text
GET /healthz
GET /readyz
GET /api/v1/public/state
GET /api/v1/public/history?from=<ms>&to=<ms>&limit=<n>&cursor=<token>
GET /api/v1/public/history/summary?from=<ms>&to=<ms>&bucketMs=<n>
GET /api/v1/public/packets?from=<ms>&to=<ms>&limit=<n>&cursor=<token>
GET /ws/public
```

With `PUBLIC_MODE=true`, internal debug APIs are not exposed.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Open:

```text
http://localhost:39476
```

The dashboard starts in the original MapLibre/CARTO dark view. Use the map
base toggle in the map controls to switch the same live map to the
OpenFreeMap 3D view without changing ports or services.
Use the top theme controls to switch dark/light mode and choose a color
palette. These are browser-local preferences and do not change backend data.

Optional isolated OpenFreeMap 3D dev stack:

```bash
docker compose -f docker-compose.openfreemap.yml up --build
```

Open `http://localhost:39477`. This stack reuses the same `.env` credentials
but uses a separate MQTT client ID and `data-openfreemap/` database directory so
it can run beside the main container.

The committed example runs a synthetic fixture by default so a fresh clone works
without MQTT credentials. To connect to live MQTT, edit your private `.env`, set
`MQTT_ENABLED=true`, clear `FIXTURE_REPLAY_PATH`, and add your MQTT username and
password.

## Configuration

Real MQTT credentials, channel secrets, private keys, live databases, and local
operator config belong only in your private `.env` and `data/` directory. They
must not be committed.

Important settings:

| Variable | Required | Notes |
| --- | --- | --- |
| `PUBLIC_MODE` | yes | Use `true` for public hosting. |
| `PUBLIC_BASE_URL` | yes | Browser origin allowed for public WebSocket connections. Use your HTTPS site URL in production. |
| `MQTT_ENABLED` | yes | The public example uses `false`; set `true` only with private credentials. |
| `MQTT_BROKER_URL` | yes when MQTT is enabled | Defaults to the MeshCore Canada MQTT broker URL. |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | yes when `MESHCORE_AUTH_MODE=subscriber` and MQTT is enabled | Keep private. |
| `MESHCORE_CHANNEL_SECRETS` | optional | Keep private. Used only to decode sanitized public message bubble text. |
| `PUBLIC_IATAS` | yes | Canada IATA allowlist for public map state/events. |
| `DB_PATH` | yes | SQLite database path inside the container. |
| `CONFIG_YAML` | optional | Private local node/observer coordinate overrides. |
| `FIXTURE_REPLAY_PATH` | optional | Synthetic replay file for demos without MQTT credentials. |

## Credential-Free Demo

The committed `.env.example` already runs with the synthetic fixture:

```text
MQTT_ENABLED=false
FIXTURE_REPLAY_PATH=/app/examples/fixtures/synthetic-live.ndjson
```

Then start Docker:

```bash
docker compose up --build
```

The fixture uses fake public keys and synthetic messages. It is not copied from live traffic.

## Development

Backend:

```bash
cd backend
go test ./...
go run ./cmd/app
```

Frontend:

```bash
cd web
npm ci
npm test -- --run
npm run build
```

Docker:

```bash
docker compose build
```

## Production Hosting

The recommended v2.4.0 release path is clone + Docker Compose on a VPS or local
host, optionally behind Cloudflare Tunnel or another HTTPS reverse proxy.

For a public site:

1. Set `PUBLIC_MODE=true`.
2. Set `PUBLIC_BASE_URL` to the public HTTPS origin.
3. Keep `.env`, `data/*.db*`, and `data/config.yaml` private.
4. Back up the SQLite database before upgrades.
5. Run `docker compose up -d --build`.
6. Run the live post-deploy smoke from your workstation:

```powershell
.\scripts\live-smoke.ps1
```

More details:

- [Development](docs/development.md)
- [Production](docs/production.md)
- [Operator runbook](docs/operator-runbook.md)
- [2.3/2.4 operator and true-path packets roadmap](docs/roadmap.md)
- [Privacy](docs/privacy.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).

## Sources

- MeshCore packet format: https://github.com/meshcore-dev/MeshCore/blob/main/docs/packet_format.md
- MeshCore payload format: https://github.com/meshcore-dev/MeshCore/blob/main/docs/payloads.md
- MeshCore Canada MQTT guides: https://meshcore.ca/analyzer/builds/mctomqtt/
- MeshCore MQTT broker subscriber role notes: https://github.com/michaelhart/meshcore-mqtt-broker
