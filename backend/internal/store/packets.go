package store

import (
	"context"
	"encoding/hex"
	"strings"
	"time"

	"meshcore-canada-live-map/backend/internal/live"
	"meshcore-canada-live-map/backend/internal/meshcore"
)

func (s *Store) UpsertPacket(ctx context.Context, parsed meshcore.ParsedPacket, seenAt int64) error {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO packets (
  packet_hash, raw_hex, route_type, route_type_name, payload_type, payload_type_name,
  payload_version, hash_size, hop_count, path_hex, payload_hex, invalid_for_map,
  invalid_reason, first_seen_ms, last_seen_ms, seen_count
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
ON CONFLICT(packet_hash) DO UPDATE SET
  last_seen_ms=excluded.last_seen_ms,
  seen_count=packets.seen_count + 1
`,
		parsed.PacketHash,
		parsed.RawHex,
		parsed.RouteType,
		parsed.RouteTypeName,
		parsed.PayloadType,
		parsed.PayloadTypeName,
		parsed.PayloadVersion,
		parsed.HashSize,
		parsed.HopCount,
		strings.ToUpper(hex.EncodeToString(parsed.PathBytes)),
		strings.ToUpper(hex.EncodeToString(parsed.Payload)),
		boolInt(parsed.InvalidForMap),
		parsed.InvalidReason,
		seenAt,
		seenAt,
	)
	return err
}

func (s *Store) RecentPackets(ctx context.Context, limit int) ([]live.PacketObservation, error) {
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	maxHeardAt := time.Now().Add(maxFutureEdgeSkew).UnixMilli()
	rows, err := s.db.QueryContext(ctx, `
SELECT id, packet_hash, payload_type, payload_type_name, route_type, route_type_name,
  observer_name, observer_public_key, iata, heard_at_ms, rssi, snr, score, hash_size,
  hop_count, path_hex, resolution_status, resolution_reason, summary, message_sender, message_text, invalid_for_map
FROM packet_observations
WHERE heard_at_ms <= ?
ORDER BY heard_at_ms DESC, id DESC
LIMIT ?`, maxHeardAt, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPacketObservations(rows)
}

func (s *Store) PacketByHash(ctx context.Context, packetHash string) (map[string]any, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT packet_hash, raw_hex, route_type_name, payload_type_name, payload_version,
  hash_size, hop_count, path_hex, payload_hex, invalid_for_map, invalid_reason,
  first_seen_ms, last_seen_ms, seen_count
FROM packets
WHERE packet_hash=?`, packetHash)
	var out = map[string]any{}
	var rawHex, route, payload, pathHex, payloadHex, invalidReason string
	var hash string
	var version, hashSize, hopCount, invalid, seen int
	var firstSeen, lastSeen int64
	if err := row.Scan(&hash, &rawHex, &route, &payload, &version, &hashSize, &hopCount, &pathHex, &payloadHex, &invalid, &invalidReason, &firstSeen, &lastSeen, &seen); err != nil {
		return nil, err
	}
	out["packetHash"] = hash
	out["rawHex"] = rawHex
	out["routeTypeName"] = route
	out["payloadTypeName"] = payload
	out["payloadVersion"] = version
	out["hashSize"] = hashSize
	out["hopCount"] = hopCount
	out["pathHex"] = pathHex
	out["payloadHex"] = payloadHex
	out["invalidForMap"] = invalid == 1
	out["invalidReason"] = invalidReason
	out["firstSeen"] = firstSeen
	out["lastSeen"] = lastSeen
	out["seenCount"] = seen
	return out, nil
}

func boolInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
