package live

import (
	"sync/atomic"
	"time"
)

type RuntimeStats struct {
	publicStateRequests        atomic.Int64
	publicStateErrors          atomic.Int64
	publicStateLastLatencyMs   atomic.Int64
	publicHistoryRequests      atomic.Int64
	publicHistoryErrors        atomic.Int64
	publicHistoryLastLatencyMs atomic.Int64
	publicSummaryRequests      atomic.Int64
	publicSummaryErrors        atomic.Int64
	publicSummaryLastLatencyMs atomic.Int64
	cacheRefreshFailures       atomic.Int64
	cacheRefreshLastLatencyMs  atomic.Int64
	cacheRefreshLastAtMs       atomic.Int64
}

type RuntimeStatsSnapshot struct {
	PublicStateRequests        int64 `json:"publicStateRequests"`
	PublicStateErrors          int64 `json:"publicStateErrors"`
	PublicStateLastLatencyMs   int64 `json:"publicStateLastLatencyMs"`
	PublicHistoryRequests      int64 `json:"publicHistoryRequests"`
	PublicHistoryErrors        int64 `json:"publicHistoryErrors"`
	PublicHistoryLastLatencyMs int64 `json:"publicHistoryLastLatencyMs"`
	PublicSummaryRequests      int64 `json:"publicSummaryRequests"`
	PublicSummaryErrors        int64 `json:"publicSummaryErrors"`
	PublicSummaryLastLatencyMs int64 `json:"publicSummaryLastLatencyMs"`
	CacheRefreshFailures       int64 `json:"cacheRefreshFailures"`
	CacheRefreshLastLatencyMs  int64 `json:"cacheRefreshLastLatencyMs"`
	CacheRefreshLastAtMs       int64 `json:"cacheRefreshLastAtMs"`
}

func NewRuntimeStats() *RuntimeStats {
	return &RuntimeStats{}
}

func (s *RuntimeStats) RecordPublicState(duration time.Duration, failed bool) {
	if s == nil {
		return
	}
	s.publicStateRequests.Add(1)
	if failed {
		s.publicStateErrors.Add(1)
	}
	s.publicStateLastLatencyMs.Store(duration.Milliseconds())
}

func (s *RuntimeStats) RecordPublicHistory(duration time.Duration, failed bool) {
	if s == nil {
		return
	}
	s.publicHistoryRequests.Add(1)
	if failed {
		s.publicHistoryErrors.Add(1)
	}
	s.publicHistoryLastLatencyMs.Store(duration.Milliseconds())
}

func (s *RuntimeStats) RecordPublicSummary(duration time.Duration, failed bool) {
	if s == nil {
		return
	}
	s.publicSummaryRequests.Add(1)
	if failed {
		s.publicSummaryErrors.Add(1)
	}
	s.publicSummaryLastLatencyMs.Store(duration.Milliseconds())
}

func (s *RuntimeStats) RecordCacheRefresh(duration time.Duration, failed bool) {
	if s == nil {
		return
	}
	if failed {
		s.cacheRefreshFailures.Add(1)
	}
	s.cacheRefreshLastLatencyMs.Store(duration.Milliseconds())
	s.cacheRefreshLastAtMs.Store(time.Now().UnixMilli())
}

func (s *RuntimeStats) Snapshot() RuntimeStatsSnapshot {
	if s == nil {
		return RuntimeStatsSnapshot{}
	}
	return RuntimeStatsSnapshot{
		PublicStateRequests:        s.publicStateRequests.Load(),
		PublicStateErrors:          s.publicStateErrors.Load(),
		PublicStateLastLatencyMs:   s.publicStateLastLatencyMs.Load(),
		PublicHistoryRequests:      s.publicHistoryRequests.Load(),
		PublicHistoryErrors:        s.publicHistoryErrors.Load(),
		PublicHistoryLastLatencyMs: s.publicHistoryLastLatencyMs.Load(),
		PublicSummaryRequests:      s.publicSummaryRequests.Load(),
		PublicSummaryErrors:        s.publicSummaryErrors.Load(),
		PublicSummaryLastLatencyMs: s.publicSummaryLastLatencyMs.Load(),
		CacheRefreshFailures:       s.cacheRefreshFailures.Load(),
		CacheRefreshLastLatencyMs:  s.cacheRefreshLastLatencyMs.Load(),
		CacheRefreshLastAtMs:       s.cacheRefreshLastAtMs.Load(),
	}
}
