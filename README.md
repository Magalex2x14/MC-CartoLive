# MeshCore MQTT Live Map v2.4.7

Also known as **MC-CartoLive**.

MC-CartoLive is a Dockerized live MQTT-to-map dashboard for MeshCore public RF
observations. It ingests MeshCore broker traffic, resolves only
high-confidence RF routes, and serves a smooth public MapLibre dashboard with
live packet motion, observer activity, decoded public message bubbles, and
privacy-safe public APIs.

The app stays intentionally simple for operators: one Go backend, one embedded
React frontend, one SQLite database, one Docker Compose service.

Public instance: [MeshCore Canada MQTT](https://carto.canadaverse.org/).

## Screenshots

Real public map data from the production UI:

![Canada cluster overview](docs/assets/screenshots/canada-clusters.png)

![Toronto live route detail](docs/assets/screenshots/toronto-detail.png)

![Ottawa live route detail](docs/assets/screenshots/ottawa-detail.png)

## Capabilities

- Ingests MeshCore MQTT traffic read-only, decodes public-safe packet metadata,
  and stores observations in SQLite.
- Resolves only high-confidence RF routes. Ambiguous, unresolved, unmappable, or
  disallowed-IATA traffic is counted for diagnostics but not guessed onto the map.
- Serves a MapLibre public dashboard with clustered overview, detail zoom,
  live packet comets, observer activity, message bubbles, Plot Routes, a
  reachable-node phonebook, OpenFreeMap 3D mode, light/dark themes, and palette
  controls.
- Provides a hidden-by-default VCR for 24h public replay and a Packets tab for
  true-path packet records backed only by persisted routed edge events.
- Includes operator tools for release checks, live droplet smoke checks, soak
  checks, performance counters, and local-only map-inclusion diagnostics.
- Keeps public APIs sanitized: no broker credentials, channel secrets, live DB
  files, packet hashes, full public keys, raw path hex, raw payloads, or resolver
  debug details.

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
GET /api/v1/public/packets?from=<ms>&to=<ms>&limit=<n>&cursor=<token>&iata=&payload=&minHops=&messageOnly=&q=
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

The dashboard starts in the MapLibre/CARTO dark view. Use the map base toggle
to switch the same live map to OpenFreeMap 3D without changing ports or
services.
Use the top theme controls to switch dark/light mode and choose a color
palette. These are browser-local preferences and do not change backend data.

The committed example runs a synthetic fixture by default so a fresh clone works
without MQTT credentials. To connect to live MQTT, edit your private `.env`, set
`MQTT_ENABLED=true`, clear `FIXTURE_REPLAY_PATH`, and add your MQTT username and
password.

## Published Docker Image

Tagged releases publish a built image to GitHub Container Registry:

```text
ghcr.io/n30nex/mc-cartolive:<version>
ghcr.io/n30nex/mc-cartolive:<major>.<minor>
ghcr.io/n30nex/mc-cartolive:latest
```

Run the published image in credential-free demo mode:

```bash
docker run --rm -p 8080:8080 \
  -e MQTT_ENABLED=false \
  -e PUBLIC_MODE=true \
  -e PUBLIC_BASE_URL=http://localhost:8080 \
  -e FIXTURE_REPLAY_PATH=/app/examples/fixtures/synthetic-live.ndjson \
  ghcr.io/n30nex/mc-cartolive:2.4.7
```

For a real public deployment, mount persistent data and provide private MQTT
credentials through environment variables or an env file:

```bash
docker run -d --name mc-cartolive \
  -p 8080:8080 \
  --env-file .env \
  -v mc-cartolive-data:/app/data \
  ghcr.io/n30nex/mc-cartolive:2.4.7
```

The image includes the synthetic demo fixture, runs as non-root `appuser`, and
exposes `/healthz` for container liveness.

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

The recommended v2.4.7 release path is clone + Docker Compose on a VPS or local
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
- [Roadmap and release focus](docs/roadmap.md)
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
