package api

import (
	"testing"
	"time"

	"meshcore-canada-live-map/backend/internal/live"
)

func TestCanonicalHistorySummaryWindowRoundsDownToStableBuckets(t *testing.T) {
	from, to := canonicalHistorySummaryWindow(125_999, 188_123)
	if from != 120_000 || to != 180_000 {
		t.Fatalf("canonical window = %d..%d, want 120000..180000", from, to)
	}
}

func TestHistorySummaryCacheReturnsCopiesAndExpires(t *testing.T) {
	cache := newHistorySummaryCache(20 * time.Millisecond)
	response := live.PublicHistorySummaryResponse{
		ServerTime: 10,
		From:       0,
		To:         60_000,
		BucketMs:   30_000,
		Buckets: []live.PublicHistorySummaryBucket{
			{Start: 0, End: 30_000, Count: 3},
		},
	}
	cache.Set(response.From, response.To, response.BucketMs, response)

	got, ok := cache.Get(response.From, response.To, response.BucketMs)
	if !ok {
		t.Fatalf("summary cache miss")
	}
	got.Buckets[0].Count = 99
	gotAgain, ok := cache.Get(response.From, response.To, response.BucketMs)
	if !ok || gotAgain.Buckets[0].Count != 3 {
		t.Fatalf("summary cache did not preserve immutable copy: %#v ok=%v", gotAgain, ok)
	}

	time.Sleep(30 * time.Millisecond)
	if _, ok := cache.Get(response.From, response.To, response.BucketMs); ok {
		t.Fatalf("summary cache entry should expire")
	}
}
