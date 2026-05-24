# MC-CartoLive Operator Runbook

## Deploy

```bash
cd /opt/MC-CartoLive
git pull --ff-only
export APP_VERSION=$(cat VERSION)
export VITE_GIT_SHA=$(git rev-parse --short HEAD)
export VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export VITE_BUILD_NUMBER=$(date -u +%Y%m%dT%H%M%S)
docker compose build
docker compose up -d
```

## Smoke Check

```bash
curl -fsS http://127.0.0.1/healthz
curl -fsS http://127.0.0.1/readyz
curl -fsS http://127.0.0.1/api/v1/public/state >/tmp/mc-state.json
```

For local release checks:

```bash
scripts/release-check.sh
```

On Windows:

```powershell
.\scripts\release-check.ps1 -BaseUrl http://127.0.0.1:39476
```

## Diagnose Missing Nodes Or Observers

Run the local diagnostic command from the backend folder:

```bash
cd backend
go run ./cmd/diagnose --db ../data/meshcore-live.db --iata YTR --public-iatas "$PUBLIC_IATAS"
go run ./cmd/diagnose --db ../data/meshcore-live.db --name Krabs --public-iatas "$PUBLIC_IATAS"
go run ./cmd/diagnose --db ../data/meshcore-live.db --name Corebot --public-iatas "$PUBLIC_IATAS"
```

Map reasons:

- `mappable`: valid public coordinate and not filtered.
- `missing_coords`: no usable latitude/longitude.
- `zero_coords`: coordinate is `0,0` or one side is zero.
- `outside_bounds`: coordinate is outside public Canada map bounds.
- `iata_filtered`: record belongs only to an IATA outside the public allowlist.

Names are labels, not identity. If a node name contains `YTR` but its IATA is
`YGK`, the map treats it as `YGK`.

## Verify Live Motion

- Top packet total should continue increasing while MQTT is connected.
- `/healthz` should show low `cacheAgeMs` and `mqttLastMessageAgeMs`.
- `recentRoutePulseAgeMs` should stay recent when routed traffic exists.
- The browser WebSocket status should recover after a forced reconnect and
  packet comets should resume without duplicated stale bursts.

## Backup And Restore

Before upgrades:

```bash
mkdir -p backups
cp data/meshcore-live.db* backups/
```

If `sqlite3` is installed:

```bash
sqlite3 data/meshcore-live.db ".backup 'backups/meshcore-live.backup.db'"
```

Restore by stopping the container, copying the database files back into
`data/`, then starting Docker Compose again.

## Privacy Check

Before release, inspect public responses and WebSocket payloads for forbidden
fields or values:

- raw packet hashes
- raw payload/path hex
- full public keys
- resolver debug fields
- broker credentials
- channel secrets
- local operator config
