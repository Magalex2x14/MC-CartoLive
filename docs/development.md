# Development

## Local Docker

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:39476`.

The default public dashboard uses the original MapLibre/CARTO dark map on this
same port. Use the in-app map base toggle to switch to the OpenFreeMap 3D view
without starting a second service.

The public example starts in fixture mode. To use live MQTT, edit `.env`, set
`MQTT_ENABLED=true`, clear `FIXTURE_REPLAY_PATH`, and add private MQTT
credentials.

Do not commit `.env`, `data/config.yaml`, live databases, or WAL/SHM files.

## Optional Isolated OpenFreeMap 3D Docker

The main app already includes OpenFreeMap as a runtime toggle. The separate
OpenFreeMap development stack is only for isolating tile/style endpoint changes
or running a second test container beside the main one:

```bash
docker compose -f docker-compose.openfreemap.yml up --build
```

Open `http://localhost:39477`.

The stack reuses private MQTT credentials from `.env`, overrides
`PUBLIC_BASE_URL` for the dev port, and stores its database under
`data-openfreemap/`. The bundled default is a dark OpenFreeMap 3D style backed
by hosted OpenFreeMap vector tiles and MapLibre DEM terrain/hillshade; override
the `VITE_OPENFREEMAP_*` and `VITE_TERRAIN_*` values in `.env` if you later
point the renderer at local/self-hosted tiles.

## Credential-Free Fixture Run

Use this when you do not have MQTT credentials or when testing UI behavior in a
repeatable way.

The committed `.env.example` already uses:

```text
MQTT_ENABLED=false
FIXTURE_REPLAY_PATH=/app/examples/fixtures/synthetic-live.ndjson
```

Then run:

```bash
docker compose up --build
```

The fixture at `examples/fixtures/synthetic-live.ndjson` contains fake public
keys, fake node names, and synthetic decoded message text.

## Backend

```bash
cd backend
go test ./...
go run ./cmd/app
```

Useful local debug APIs are available only when `PUBLIC_MODE=false`:

```bash
curl http://localhost:39476/api/v1/live/state
curl "http://localhost:39476/api/v1/debug/resolution?status=ambiguous&limit=50"
curl "http://localhost:39476/api/v1/debug/collisions?hashSize=1"
```

## Frontend

```bash
cd web
npm ci
npm test -- --run
npm run build
```

Vite dev server:

```bash
cd web
npm run dev
```

The frontend expects the Go backend for live API/WebSocket data when running
outside Docker.

Set `VITE_BUILD_NUMBER` when you want a deterministic build label in the top
project bar. Docker and CI builds also pick up `GITHUB_SHA` when present.

## Mobile UI

The mobile layout keeps the map, route motion, packet comets, Live Follow,
and route-copy tools as the primary experience. Secondary panels,
status toasts, the legend, and busy-path lists are hidden by default at small
viewport widths.

## Node Connectivity UI

At detail zoom, click a repeater, observer, room, companion, or sensor to test
the connectivity focus. Directly served routes and direct neighbors should
brighten while unrelated routes and nodes dim. The phonebook panel should put
least-hop useful routes first by default, allow search by city/region/node
label/public ID/route prefix, support distance filtering, and clicking a row
should highlight the shortest valid public route path without changing the
selected source node.

Route lines on the map are intentionally passive: mouse hover should not glow a
route, and clicking a dense route line should either select an overlapping node,
expand a cluster, or clear selection on empty map space.

Escape, the panel close button, and an empty map click should clear node, route,
and phonebook path focus.

## Route Copy And Plotting

For v2.4.5 VCR, route-copy, phonebook, live-confidence, true-path packet, map settings, and route performance checks:

- Select a node, click a phonebook row, and confirm a Copy route button appears
  with a comma-separated six-character MeshCore 3-byte path.
- Use the phonebook search box and distance filter to narrow reachable nodes,
  then switch between Best route, Shortest, Busiest, Nearest, and Most recent.
  The default should never put maximum-hop routes at the top.
- The copy button should use `pathHash3` route endpoint fields only; full public
  keys must never be exposed.
- Leave the map open at a dense detail zoom and confirm packet counters can
  update without route lines stuttering or route-hover glow work returning.
- Watch a bursty live period or reconnect the websocket and confirm packet
  counters/comets tick through the burst instead of landing in one frame.
- Force a WebSocket reconnect and confirm the status moves through recovering,
  refreshes the public snapshot, and resumes packet comets without duplicates.
- Confirm `/healthz` reports `packetIngestState=fresh` when packets are less
  than five seconds stale, and `mapMotionState=quiet` does not imply broken MQTT
  when no routed/observer-positioned activity is fresh.
- Below zoom 7.08, confirm clusters are the only node/route visual and cluster
  role badges glow subtly on fresh activity.
- At zoom 7.08 and above, confirm nodes and routes appear together, ordinary
  node labels appear only on hover/details, observer labels persist without
  last-seen text, and idle routes stay subdued until a packet comet uses them.
- Confirm Live Follow smoothly follows fresh packet movement and can be toggled
  off without leaving the map in a forced camera state.
- Open Packets, click Replay on a true-path packet, and confirm the Packets
  panel compacts, live packet flow pauses, the map fits the complete path, waits
  briefly, then animates the selected packet at a watchable pace.
- Zoom out during a selected packet replay or long Plot Routes result and
  confirm the highlighted analysis route stays visible without showing every
  idle known route.
- Open Map Settings and verify layer toggles for clusters, nodes, labels,
  known routes, highlighted analysis paths, live comets, trails, observer
  bursts, and message bubbles do not trigger unnecessary source rebuilds.
- Adjust packet speed, brightness, trail length, and animation style, then
  confirm live comets and forced packet replay reflect the settings.
- Filter the Packets tab by IATA, payload, minimum hops, message-only, and text
  query; confirm results come from the server-backed 24h window, not only the
  currently loaded rows.
- Confirm the VCR is hidden on first load, the live pulse clock appears bottom
  right, and the bottom-left action dock opens the slim VCR without overlapping
  map controls.
- Pause the VCR, wait for public packets, confirm the missed counter increases,
  replay missed packets, and confirm comets/observer bursts animate through the
  same live-map paths.
- Scrub the VCR timeline in the last 24h, start replay from that point, and
  confirm Live Follow stays disabled until returning to Live.
- Open the top-bar Perf tab or set `localStorage.setItem('mc-cartolive-debug-perf', '1')`
  in a browser console, then inspect `window.__mcCartoLivePerf` while animating
  routes. Counters are browser-local only and must not be sent over the network.
- Confirm Search and compact Legend open top-left without overlap, Busy
  Pathways is hidden by default, and the Panels menu restores each panel.
- Switch dark/light mode and several palettes; verify links, Legend, VCR, and
  map controls remain readable.
- Use `go run ./cmd/diagnose --db ../data/meshcore-live.db --iata YTR` from
  `backend/` to confirm unmapped records report actual IATAs, public allowlist
  status, coordinate status, label IATA hints, position source, and mappability
  reasons.
- Click Plot routes, choose two node endpoints, and confirm the shortest public
  route path glows with a closeable route toast.
- Switch to map-square mode, click two map corners, and confirm all public
  routes crossing the selected square are listed and highlighted.
- Select a node with decoded public messages in the current live window and
  confirm its chatter history is scrollable and closeable.

## Release Checks

Run before publishing or opening a pull request:

```bash
cd backend
go test ./...
```

```bash
cd web
npm ci
npm test -- --run
npm run build
```

```bash
docker compose build
```

Smoke check a built container:

```bash
curl http://localhost:39476/healthz
curl http://localhost:39476/readyz
curl http://localhost:39476/api/v1/public/state
curl "http://localhost:39476/api/v1/public/history?limit=10"
curl "http://localhost:39476/api/v1/public/packets?limit=10"
```

Run a short local soak when validating release automation:

```powershell
.\scripts\soak-check.ps1 -BaseUrl http://127.0.0.1:39476 -DurationMinutes 10 -IntervalSeconds 30
```

Run production smoke from your workstation after a droplet deploy:

```powershell
.\scripts\live-smoke.ps1
```

Use overrides when testing a branch, alternate host, expected build, or another
diagnostic IATA:

```powershell
.\scripts\live-smoke.ps1 -BaseUrl https://carto.canadaverse.org -ExpectedVersion 2.4.5 -ExpectedGitSha <short-sha> -DiagnoseIata YTR
```

Check privacy before committing:

```bash
git status --short --ignored
```

Private files should appear only under ignored output.
