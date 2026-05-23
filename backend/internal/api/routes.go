package api

import (
	"compress/gzip"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"meshcore-canada-live-map/backend/internal/live"
	"meshcore-canada-live-map/backend/internal/store"
)

type Config struct {
	RecentPacketLimit    int
	RecentEdgeEventLimit int
	DefaultCenterLat     float64
	DefaultCenterLng     float64
	DefaultZoom          float64
	PublicMode           bool
	StrictRFOnly         bool
	MaxUnverifiedEdgeKM  float64
}

type Server struct {
	Config           Config
	Store            *store.Store
	Hub              *live.Hub
	PublicHub        *live.Hub
	MQTTConnected    func() bool
	MQTTTotal        func() int64
	PublicState      func() (live.PublicLiveState, bool)
	PublicAllowsIATA func(string) bool
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.healthz)
	mux.HandleFunc("GET /api/v1/public/state", s.publicState)
	mux.HandleFunc("GET /api/v1/public/history", s.publicHistory)
	mux.HandleFunc("GET /api/v1/public/history/summary", s.publicHistorySummary)
	mux.Handle("GET /ws/public", s.PublicHub)
	if !s.Config.PublicMode {
		mux.HandleFunc("GET /api/v1/live/state", s.liveState)
		mux.HandleFunc("GET /api/v1/nodes", s.nodes)
		mux.HandleFunc("GET /api/v1/nodes/{nodeID}", s.nodeByID)
		mux.HandleFunc("GET /api/v1/packets/recent", s.recentPackets)
		mux.HandleFunc("GET /api/v1/packets/{packetHash}", s.packetByHash)
		mux.HandleFunc("GET /api/v1/debug/resolution", s.debugResolution)
		mux.HandleFunc("GET /api/v1/debug/collisions", s.debugCollisions)
		mux.HandleFunc("GET /api/v1/debug/stats", s.debugStats)
		mux.Handle("GET /ws", s.Hub)
	}
	mux.HandleFunc("/", StaticHandler)
	return withSecurityHeaders(mux)
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	if s.PublicState != nil {
		if state, ok := s.PublicState(); ok {
			writeJSON(w, http.StatusOK, map[string]any{
				"ok":                true,
				"mqttConnected":     s.MQTTConnected(),
				"broker":            "mqtt1",
				"packets":           state.Stats.Packets,
				"nodesWithPosition": state.Stats.ActiveNodes,
				"edgeEvents":        state.Stats.ActiveRoutes,
				"unresolved":        publicResolutionCount(state.Stats.ResolutionBuckets, "unresolved_path"),
				"wsClients":         s.wsClientCount(),
				"mqttMessages":      s.MQTTTotal(),
				"cached":            true,
			})
			return
		}
	}
	stats, err := s.Store.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":                true,
		"mqttConnected":     s.MQTTConnected(),
		"broker":            "mqtt1",
		"packets":           stats.Packets,
		"nodesWithPosition": stats.NodesWithPosition,
		"edgeEvents":        stats.EdgeEvents,
		"unresolved":        stats.Unresolved,
		"wsClients":         s.wsClientCount(),
		"mqttMessages":      s.MQTTTotal(),
	})
}

func publicResolutionCount(buckets map[string]map[string]int64, name string) int64 {
	var total int64
	for _, region := range buckets {
		total += region[name]
	}
	return total
}

func (s *Server) publicState(w http.ResponseWriter, r *http.Request) {
	if s.PublicState != nil {
		if state, ok := s.PublicState(); ok {
			now := time.Now().UnixMilli()
			state.ServerTime = now
			state.Stats.ServerTime = now
			state.Stats.MQTTConnected = s.MQTTConnected()
			state.Stats.MQTTMessages = s.MQTTTotal()
			state.Stats.WSClients = s.wsClientCount()
			writeJSON(w, http.StatusOK, state)
			return
		}
	}
	state, err := s.Store.LiveState(r.Context(), s.Config.RecentPacketLimit, s.Config.RecentEdgeEventLimit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	stats, err := s.Store.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, live.BuildPublicLiveState(state, live.PublicStats{
		Packets:       stats.Packets,
		MQTTConnected: s.MQTTConnected(),
		MQTTMessages:  s.MQTTTotal(),
		WSClients:     s.wsClientCount(),
		ServerTime:    time.Now().UnixMilli(),
	}))
}

const (
	publicHistoryDefaultWindowMs = int64(time.Hour / time.Millisecond)
	publicHistoryMaxWindowMs     = int64(24 * time.Hour / time.Millisecond)
	publicHistoryMaxLimit        = 2000
	publicHistoryDefaultLimit    = 1000
	publicHistoryTargetBuckets   = 96
	publicHistoryMaxBuckets      = 288
)

func (s *Server) publicHistory(w http.ResponseWriter, r *http.Request) {
	if s.Store == nil {
		writeError(w, http.StatusServiceUnavailable, errors.New("store is not available"))
		return
	}
	now := time.Now().UnixMilli()
	from, to := publicHistoryWindow(r, now)
	limit := queryInt(r, "limit", publicHistoryDefaultLimit)
	if limit <= 0 {
		limit = publicHistoryDefaultLimit
	}
	if limit > publicHistoryMaxLimit {
		limit = publicHistoryMaxLimit
	}
	cursor, err := decodeHistoryCursor(r.URL.Query().Get("cursor"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	nodes, observers, err := s.publicLocationInputs(r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	observerLocations := live.BuildPublicObserverLocationIndex(nodes, observers)
	pathHash3ByNodeID := live.BuildPublicPathHash3Index(nodes, observers)

	events := make([]live.PublicHistoryEvent, 0, limit)
	nextCursor := cursor
	for len(events) < limit {
		rawLimit := historyRawPageSize(limit - len(events))
		rawEvents, err := s.Store.PublicHistoryEvents(r.Context(), store.HistoryQuery{
			From:   from,
			To:     to,
			Limit:  rawLimit,
			Cursor: nextCursor,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		if len(rawEvents) == 0 {
			nextCursor = nil
			break
		}
		for _, rawEvent := range rawEvents {
			cursorValue := rawEvent.Cursor()
			nextCursor = &cursorValue
			if !s.allowsPublicIATA(rawEvent.IATA()) {
				continue
			}
			event, ok := publicHistoryEvent(rawEvent, observerLocations, pathHash3ByNodeID)
			if !ok {
				continue
			}
			events = append(events, event)
			if len(events) >= limit {
				break
			}
		}
		if len(rawEvents) < rawLimit || len(events) >= limit {
			break
		}
	}

	nextCursorToken := ""
	if len(events) >= limit && nextCursor != nil {
		nextCursorToken = encodeHistoryCursor(*nextCursor)
	}
	writeJSON(w, http.StatusOK, live.PublicHistoryResponse{
		ServerTime: now,
		Events:     events,
		NextCursor: nextCursorToken,
		Window: live.PublicHistoryWindow{
			From:  from,
			To:    to,
			Count: len(events),
		},
	})
}

func (s *Server) publicHistorySummary(w http.ResponseWriter, r *http.Request) {
	if s.Store == nil {
		writeError(w, http.StatusServiceUnavailable, errors.New("store is not available"))
		return
	}
	now := time.Now().UnixMilli()
	from, to := publicHistoryWindow(r, now)
	bucketMs := queryInt64(r, "bucketMs", 0)
	if bucketMs <= 0 {
		bucketMs = defaultHistoryBucketMs(to - from)
	}
	if bucketMs < 1000 {
		bucketMs = 1000
	}
	if bucketsForSpan(to-from, bucketMs) > publicHistoryMaxBuckets {
		bucketMs = ceilDiv(to-from, publicHistoryMaxBuckets)
	}
	buckets := make([]live.PublicHistorySummaryBucket, bucketsForSpan(to-from, bucketMs))
	for i := range buckets {
		start := from + int64(i)*bucketMs
		end := start + bucketMs
		if end > to {
			end = to
		}
		buckets[i] = live.PublicHistorySummaryBucket{Start: start, End: end}
	}
	rows, err := s.Store.PublicHistorySummary(r.Context(), from, to, bucketMs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	for _, row := range rows {
		if !s.allowsPublicIATA(row.IATA) || row.Bucket < 0 || int(row.Bucket) >= len(buckets) {
			continue
		}
		buckets[row.Bucket].Count += row.Count
	}
	writeJSON(w, http.StatusOK, live.PublicHistorySummaryResponse{
		ServerTime: now,
		From:       from,
		To:         to,
		BucketMs:   bucketMs,
		Buckets:    buckets,
	})
}

func (s *Server) publicLocationInputs(r *http.Request) ([]live.Node, []live.Observer, error) {
	nodes, err := s.Store.Nodes(r.Context(), true, "")
	if err != nil {
		return nil, nil, err
	}
	observers, err := s.Store.Observers(r.Context())
	if err != nil {
		return nil, nil, err
	}
	return nodes, observers, nil
}

func publicHistoryEvent(
	raw store.HistoryEvent,
	observerLocations live.PublicObserverLocationIndex,
	pathHash3ByNodeID map[string]string,
) (live.PublicHistoryEvent, bool) {
	switch raw.Type {
	case "activity":
		if raw.Edge != nil {
			activity, ok := live.PublicActivityFromEdge(*raw.Edge)
			if !ok {
				return live.PublicHistoryEvent{}, false
			}
			return live.PublicHistoryEvent{Type: "activity", At: raw.At, Data: activity}, true
		}
		if raw.Packet != nil {
			activity := live.PublicActivityFromPacket(
				*raw.Packet,
				nil,
				observerLocations.LocationForPublicKey(raw.Packet.ObserverPublicKey, raw.Packet.IATA),
			)
			return live.PublicHistoryEvent{Type: "activity", At: raw.At, Data: activity}, true
		}
	case "routePulse":
		if raw.Edge == nil {
			return live.PublicHistoryEvent{}, false
		}
		pulse, ok := live.PublicRoutePulseFromEdge(*raw.Edge, pathHash3ByNodeID)
		if !ok {
			return live.PublicHistoryEvent{}, false
		}
		return live.PublicHistoryEvent{Type: "routePulse", At: raw.At, Data: pulse}, true
	}
	return live.PublicHistoryEvent{}, false
}

func publicHistoryWindow(r *http.Request, now int64) (int64, int64) {
	to := queryInt64(r, "to", now)
	if to <= 0 || to > now {
		to = now
	}
	from := queryInt64(r, "from", to-publicHistoryDefaultWindowMs)
	if from > to {
		from = to
	}
	if to-from > publicHistoryMaxWindowMs {
		from = to - publicHistoryMaxWindowMs
	}
	if from < 0 {
		from = 0
	}
	return from, to
}

func historyRawPageSize(remaining int) int {
	limit := remaining * 4
	if limit < 200 {
		limit = 200
	}
	if limit > 5000 {
		limit = 5000
	}
	return limit
}

func defaultHistoryBucketMs(span int64) int64 {
	if span <= 0 {
		return int64(time.Minute / time.Millisecond)
	}
	bucketMs := ceilDiv(span, publicHistoryTargetBuckets)
	if bucketMs < int64(time.Minute/time.Millisecond) {
		return int64(time.Minute / time.Millisecond)
	}
	return bucketMs
}

func bucketsForSpan(span int64, bucketMs int64) int {
	if span <= 0 || bucketMs <= 0 {
		return 1
	}
	return int(ceilDiv(span, int(bucketMs)))
}

func ceilDiv(value int64, divisor int) int64 {
	if value <= 0 {
		return 1
	}
	d := int64(divisor)
	return (value + d - 1) / d
}

func encodeHistoryCursor(cursor store.HistoryCursor) string {
	data, err := json.Marshal(cursor)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(data)
}

func decodeHistoryCursor(raw string) (*store.HistoryCursor, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	data, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, errors.New("invalid history cursor")
	}
	var cursor store.HistoryCursor
	if err := json.Unmarshal(data, &cursor); err != nil {
		return nil, errors.New("invalid history cursor")
	}
	return &cursor, nil
}

func (s *Server) allowsPublicIATA(iata string) bool {
	if s.PublicAllowsIATA == nil {
		return true
	}
	return s.PublicAllowsIATA(iata)
}

func (s *Server) liveState(w http.ResponseWriter, r *http.Request) {
	state, err := s.Store.LiveState(r.Context(), s.Config.RecentPacketLimit, s.Config.RecentEdgeEventLimit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, state)
}

func (s *Server) nodes(w http.ResponseWriter, r *http.Request) {
	positioned := r.URL.Query().Get("positioned") == "true"
	iata := strings.ToUpper(r.URL.Query().Get("iata"))
	nodes, err := s.Store.Nodes(r.Context(), positioned, iata)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, nodes)
}

func (s *Server) nodeByID(w http.ResponseWriter, r *http.Request) {
	nodeID := r.PathValue("nodeID")
	nodes, err := s.Store.Nodes(r.Context(), false, "")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	for _, node := range nodes {
		if node.NodeID == nodeID || node.PublicKey == strings.ToUpper(nodeID) {
			writeJSON(w, http.StatusOK, node)
			return
		}
	}
	writeError(w, http.StatusNotFound, sql.ErrNoRows)
}

func (s *Server) recentPackets(w http.ResponseWriter, r *http.Request) {
	packets, err := s.Store.RecentPackets(r.Context(), queryInt(r, "limit", 100))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, packets)
}

func (s *Server) packetByHash(w http.ResponseWriter, r *http.Request) {
	packet, err := s.Store.PacketByHash(r.Context(), r.PathValue("packetHash"))
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, sql.ErrNoRows) {
			status = http.StatusNotFound
		}
		writeError(w, status, err)
		return
	}
	writeJSON(w, http.StatusOK, packet)
}

func (s *Server) debugResolution(w http.ResponseWriter, r *http.Request) {
	rows, err := s.Store.ResolutionDebug(r.Context(), r.URL.Query().Get("status"), queryInt(r, "limit", 50))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) debugCollisions(w http.ResponseWriter, r *http.Request) {
	hashSize := queryInt(r, "hashSize", 1)
	rows, err := s.Store.Collisions(r.Context(), strings.ToUpper(r.URL.Query().Get("iata")), hashSize, queryInt(r, "limit", 100))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (s *Server) debugStats(w http.ResponseWriter, r *http.Request) {
	stats, err := s.Store.Stats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"serverTime":          time.Now().UnixMilli(),
		"stats":               stats,
		"mqttConnected":       s.MQTTConnected(),
		"mqttMessagesTotal":   s.MQTTTotal(),
		"wsClients":           s.wsClientCount(),
		"strictRFOnly":        s.Config.StrictRFOnly,
		"publicMode":          s.Config.PublicMode,
		"maxUnverifiedEdgeKm": s.Config.MaxUnverifiedEdgeKM,
		"defaultCenter":       []float64{s.Config.DefaultCenterLng, s.Config.DefaultCenterLat},
		"defaultZoom":         s.Config.DefaultZoom,
	})
}

func (s *Server) wsClientCount() int {
	count := 0
	if s.Hub != nil {
		count += s.Hub.ClientCount()
	}
	if s.PublicHub != nil {
		count += s.PublicHub.ClientCount()
	}
	return count
}

func queryInt(r *http.Request, key string, fallback int) int {
	if raw := r.URL.Query().Get(key); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			return parsed
		}
	}
	return fallback
}

func queryInt64(r *http.Request, key string, fallback int64) int64 {
	if raw := r.URL.Query().Get(key); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil {
			return parsed
		}
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]any{"error": err.Error()})
}

func withSecurityHeaders(next http.Handler) http.Handler {
	return withCompression(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		next.ServeHTTP(w, r)
	}))
}

func withCompression(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !shouldGzip(r) {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")
		gz := gzip.NewWriter(w)
		defer gz.Close()
		next.ServeHTTP(gzipResponseWriter{ResponseWriter: w, Writer: gz}, r)
	})
}

type gzipResponseWriter struct {
	http.ResponseWriter
	io.Writer
}

func (w gzipResponseWriter) WriteHeader(statusCode int) {
	w.Header().Del("Content-Length")
	w.ResponseWriter.WriteHeader(statusCode)
}

func (w gzipResponseWriter) Write(data []byte) (int, error) {
	w.Header().Del("Content-Length")
	return w.Writer.Write(data)
}

func shouldGzip(r *http.Request) bool {
	if strings.Contains(strings.ToLower(r.Header.Get("Upgrade")), "websocket") {
		return false
	}
	if r.Header.Get("Range") != "" {
		return false
	}
	return strings.Contains(r.Header.Get("Accept-Encoding"), "gzip")
}
