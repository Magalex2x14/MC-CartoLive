import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Gauge, RefreshCw, Server, Signal, X, Zap } from 'lucide-react';
import { fetchHealthz, fetchPublicHistory, fetchPublicState, fetchReadyz } from '../api';
import { ensurePerfDiagnostics, perfDiagnosticsSnapshot, setPerfDiagnosticsEnabled, type PerfCounters } from '../perfDiagnostics';
import type { PublicLiveState, RuntimeHealth } from '../types';

interface PerfPanelProps {
  onClose: () => void;
}

interface PerfSnapshot {
  health: RuntimeHealth | null;
  ready: RuntimeHealth | null;
  state: PublicLiveState | null;
  historyEvents: number | null;
  checkedAt: number;
}

export default function PerfPanel({ onClose }: PerfPanelProps) {
  const [snapshot, setSnapshot] = useState<PerfSnapshot | null>(null);
  const [counters, setCounters] = useState<PerfCounters | null>(() => {
    setPerfDiagnosticsEnabled(true);
    return ensurePerfDiagnostics();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const now = Date.now();
    Promise.all([
      fetchHealthz(),
      fetchReadyz(),
      fetchPublicState(),
      fetchPublicHistory({ from: now - 10 * 60_000, to: now, limit: 25 })
    ])
      .then(([health, ready, state, history]) => {
        if (!active) return;
        setSnapshot({
          health,
          ready,
          state,
          historyEvents: history.window.count,
          checkedAt: Date.now()
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to refresh performance data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPerfDiagnosticsEnabled(true);
    ensurePerfDiagnostics();
    const cancelRefresh = refresh();
    const metricsInterval = window.setInterval(() => {
      setCounters(perfDiagnosticsSnapshot());
    }, 1000);
    const refreshInterval = window.setInterval(refresh, 5000);
    return () => {
      cancelRefresh?.();
      window.clearInterval(metricsInterval);
      window.clearInterval(refreshInterval);
    };
  }, [refresh]);

  const health = snapshot?.health ?? null;
  const ready = snapshot?.ready ?? null;
  const state = snapshot?.state ?? null;
  const lastChecked = useMemo(() => snapshot ? new Date(snapshot.checkedAt).toLocaleTimeString() : 'not checked', [snapshot]);

  return (
    <section className="perf-panel" aria-label="Performance lab">
      <header className="perf-panel-header">
        <div>
          <span className="panel-eyebrow">Perf Lab</span>
          <h2>Live Performance</h2>
        </div>
        <div className="perf-panel-actions">
          <button type="button" className="icon-button" title="Refresh performance data" onClick={refresh}>
            <RefreshCw size={17} />
          </button>
          <button type="button" className="icon-button" title="Close performance tab" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="perf-status-strip">
        <PerfStatus label="Ingest" value={health?.packetIngestState ?? 'unknown'} tone={toneForState(health?.packetIngestState)} />
        <PerfStatus label="Cache" value={health?.publicCacheState ?? 'unknown'} tone={toneForState(health?.publicCacheState)} />
        <PerfStatus label="Map motion" value={health?.mapMotionState ?? 'unknown'} tone={toneForState(health?.mapMotionState)} />
        <PerfStatus label="Confidence" value={health?.liveConfidenceState ?? 'unknown'} tone={toneForState(health?.liveConfidenceState)} />
      </div>

      {error && <div className="perf-error" role="alert">{error}</div>}
      {loading && !snapshot && <div className="perf-loading">Loading live performance data...</div>}

      <div className="perf-grid">
        <PerfSection icon={<Signal size={17} />} title="Live Feed">
          <PerfMetric label="Packets" value={formatCount(state?.stats.packets ?? health?.packets)} />
          <PerfMetric label="Packet age" value={formatAge(health?.mqttLastMessageAgeMs)} />
          <PerfMetric label="MQTT messages" value={formatCount(health?.mqttMessages ?? state?.stats.mqttMessages)} />
          <PerfMetric label="MQTT reconnects" value={formatCount(health?.mqttReconnects)} />
          <PerfMetric label="Dropped MQTT" value={formatCount(health?.mqttDroppedMessages)} />
          <PerfMetric label="Malformed topics" value={formatCount(health?.mqttMalformedTopics)} />
        </PerfSection>

        <PerfSection icon={<Server size={17} />} title="Backend">
          <PerfMetric label="Ready" value={ready?.ready ? 'yes' : 'no'} tone={ready?.ready ? 'good' : 'bad'} />
          <PerfMetric label="DB" value={health?.dbReady ? 'ready' : 'unknown'} tone={health?.dbReady ? 'good' : 'warn'} />
          <PerfMetric label="Static assets" value={health?.staticReady ? 'ready' : 'unknown'} tone={health?.staticReady ? 'good' : 'warn'} />
          <PerfMetric label="Cache age" value={formatAge(health?.cacheAgeMs)} />
          <PerfMetric label="Cache failures" value={formatCount(health?.cacheRefreshFailures)} />
          <PerfMetric label="History latency" value={formatMs(health?.publicHistoryLatencyMs)} />
        </PerfSection>

        <PerfSection icon={<Activity size={17} />} title="Map Render">
          <PerfMetric label="Active comets" value={formatCount(counters?.packetActiveComets)} />
          <PerfMetric label="Observer bursts" value={formatCount(counters?.packetActiveObserverBursts)} />
          <PerfMetric label="Frame time" value={formatMs(counters?.packetFrameMs)} tone={frameTone(counters?.packetFrameMs)} />
          <PerfMetric label="Skipped frames" value={formatCount(counters?.packetSkippedFrames)} />
          <PerfMetric label="Route source updates" value={formatCount(counters?.routeSourceUpdates)} />
          <PerfMetric label="Node source updates" value={formatCount(counters?.nodeSourceUpdates)} />
        </PerfSection>

        <PerfSection icon={<Gauge size={17} />} title="Queues">
          <PerfMetric label="Live queue" value={formatCount(counters?.livePendingQueueSize)} />
          <PerfMetric label="VCR queue" value={formatCount(counters?.vcrReplayQueueSize)} />
          <PerfMetric label="Visibility pauses" value={formatCount(counters?.visibilityPauses)} />
          <PerfMetric label="WS clients" value={formatCount(health?.wsClients ?? state?.stats.wsClients)} />
          <PerfMetric label="WS drops" value={formatCount(health?.wsDroppedMessages)} />
          <PerfMetric label="WS high water" value={formatCount(health?.wsQueueHighWater)} />
        </PerfSection>

        <PerfSection icon={<Zap size={17} />} title="Public Payload">
          <PerfMetric label="Nodes" value={formatCount(state?.stats.activeNodes ?? health?.nodesWithPosition)} />
          <PerfMetric label="Routes" value={formatCount(state?.stats.activeRoutes ?? health?.edgeEvents)} />
          <PerfMetric label="Unresolved/min" value={formatCount(health?.unresolved)} />
          <PerfMetric label="History events" value={formatCount(snapshot?.historyEvents)} />
          <PerfMetric label="Route pulse age" value={formatAge(health?.recentRoutePulseAgeMs)} />
          <PerfMetric label="Observer age" value={formatAge(health?.recentObserverBurstAgeMs)} />
        </PerfSection>

        <PerfSection icon={<Server size={17} />} title="Build">
          <PerfMetric label="Version" value={health?.version ?? 'unknown'} />
          <PerfMetric label="Git SHA" value={health?.gitSha ?? 'unknown'} />
          <PerfMetric label="Build time" value={formatBuildTime(health?.buildTime)} />
          <PerfMetric label="Last checked" value={lastChecked} />
        </PerfSection>
      </div>

      <p className="perf-note">
        Browser counters are local-only and enabled for this tab. Nothing here sends telemetry or exposes raw packet hashes, full public keys, broker credentials, or resolver debug data.
      </p>
    </section>
  );
}

function PerfSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="perf-card">
      <h3>{icon}<span>{title}</span></h3>
      <div className="perf-metrics">{children}</div>
    </section>
  );
}

function PerfMetric({ label, value, tone }: { label: string; value: string; tone?: PerfTone }) {
  return (
    <div className={`perf-metric ${tone ? `perf-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type PerfTone = 'good' | 'warn' | 'bad' | 'quiet';

function PerfStatus({ label, value, tone }: { label: string; value: string; tone: PerfTone }) {
  return (
    <div className={`perf-status perf-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function toneForState(state: string | undefined): PerfTone {
  switch ((state ?? '').toLowerCase()) {
    case 'fresh':
    case 'moving':
    case 'ready':
      return 'good';
    case 'quiet':
    case 'unknown':
      return 'quiet';
    case 'stale':
    case 'lagged':
      return 'warn';
    case 'degraded':
    case 'error':
    case 'down':
      return 'bad';
    default:
      return 'quiet';
  }
}

export function frameTone(ms: number | undefined): PerfTone | undefined {
  if (ms === undefined) return undefined;
  if (ms <= 16.7) return 'good';
  if (ms <= 33.4) return 'warn';
  return 'bad';
}

export function formatAge(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms)) return 'unknown';
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  return `${Math.round(ms / 3_600_000)} h`;
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms)) return 'unknown';
  return `${Math.max(0, Math.round(ms * 10) / 10)} ms`;
}

function formatCount(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'unknown';
  return Math.max(0, Math.floor(value)).toLocaleString();
}

function formatBuildTime(value: string | undefined): string {
  if (!value) return 'unknown';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}
