import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Clock3, Filter, MessageSquareText, Play, RefreshCw, Route, Search, X } from 'lucide-react';
import { fetchPublicPackets } from '../api';
import { DEFAULT_PACKET_FILTERS, filterPackets, packetEndpointSummary, PACKETS_SCOPE_OPTIONS, packetWindowForScope, type PacketFilters } from '../packets';
import { payloadVisual } from '../payloadVisuals';
import type { PublicHistoryWindow, PublicPacketPath } from '../types';

interface PacketsPanelProps {
  selectedPacketID: string | null;
  onClose: () => void;
  onSelectPacket: (packet: PublicPacketPath) => void;
  onReplayPacket: (packet: PublicPacketPath) => void;
}

const PACKETS_PAGE_LIMIT = 250;

export default function PacketsPanel({ selectedPacketID, onClose, onSelectPacket, onReplayPacket }: PacketsPanelProps) {
  const [scopeMs, setScopeMs] = useState(PACKETS_SCOPE_OPTIONS[0].value);
  const [filters, setFilters] = useState<PacketFilters>(DEFAULT_PACKET_FILTERS);
  const [packets, setPackets] = useState<PublicPacketPath[]>([]);
  const [windowInfo, setWindowInfo] = useState<PublicHistoryWindow | null>(null);
  const [nextCursor, setNextCursor] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const window = packetWindowForScope(Date.now(), scopeMs);
    fetchPublicPackets({ ...window, limit: PACKETS_PAGE_LIMIT })
      .then((response) => {
        if (!active || !mountedRef.current) return;
        setPackets(dedupePackets(response.packets));
        setWindowInfo(response.window);
        setNextCursor(response.nextCursor ?? '');
        setLastCheckedAt(Date.now());
      })
      .catch((err: unknown) => {
        if (!active || !mountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Unable to load packet paths');
      })
      .finally(() => {
        if (active && mountedRef.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scopeMs]);

  const loadOlder = useCallback(() => {
    if (!windowInfo || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    fetchPublicPackets({ from: windowInfo.from, to: windowInfo.to, limit: PACKETS_PAGE_LIMIT, cursor: nextCursor })
      .then((response) => {
        if (!mountedRef.current) return;
        setPackets((current) => dedupePackets([...current, ...response.packets]));
        setNextCursor(response.nextCursor ?? '');
        setWindowInfo(response.window);
      })
      .catch((err: unknown) => {
        if (mountedRef.current) setError(err instanceof Error ? err.message : 'Unable to load older packet paths');
      })
      .finally(() => {
        if (mountedRef.current) setLoadingMore(false);
      });
  }, [loadingMore, nextCursor, windowInfo]);

  useEffect(() => {
    const cancelRefresh = refresh();
    const interval = window.setInterval(refresh, 20_000);
    return () => {
      cancelRefresh?.();
      window.clearInterval(interval);
    };
  }, [refresh]);

  const payloadOptions = useMemo(() => uniqueSorted(packets.map((packet) => packet.payloadTypeName)), [packets]);
  const iataOptions = useMemo(() => uniqueSorted(packets.map((packet) => packet.iata ?? '').filter(Boolean)), [packets]);
  const visiblePackets = useMemo(() => filterPackets(packets, filters), [filters, packets]);
  const selectedPacket = useMemo(() => packets.find((packet) => packet.id === selectedPacketID) ?? null, [packets, selectedPacketID]);

  return (
    <section className="packets-panel" aria-label="True path packets">
      <header className="packets-panel-header">
        <div>
          <span className="panel-eyebrow">Packets</span>
          <h2>True Path Packets</h2>
          <p>Only packets with real public route segments are listed here.</p>
        </div>
        <div className="packets-panel-actions">
          <button type="button" className="icon-button" title="Refresh true path packets" onClick={refresh}>
            <RefreshCw size={17} />
          </button>
          <button type="button" className="icon-button" title="Close packets tab" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="packets-summary-strip">
        <PacketSummary icon={<Route size={15} />} label="Loaded" value={packets.length.toLocaleString()} />
        <PacketSummary icon={<Filter size={15} />} label="Shown" value={visiblePackets.length.toLocaleString()} />
        <PacketSummary icon={<Clock3 size={15} />} label="Window" value={formatWindow(windowInfo)} />
        <PacketSummary icon={<MessageSquareText size={15} />} label="Updated" value={lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString() : 'loading'} />
      </div>

      <div className="packets-toolbar">
        <label className="packets-search">
          <Search size={15} />
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Search endpoint, region, route prefix, message"
          />
          {filters.query && (
            <button type="button" onClick={() => setFilters((current) => ({ ...current, query: '' }))} aria-label="Clear packet search">
              <X size={14} />
            </button>
          )}
        </label>
        <select value={filters.iata} onChange={(event) => setFilters((current) => ({ ...current, iata: event.target.value }))} aria-label="Filter packet region">
          <option value="">All regions</option>
          {iataOptions.map((iata) => <option key={iata} value={iata}>{iata}</option>)}
        </select>
        <select value={filters.payload} onChange={(event) => setFilters((current) => ({ ...current, payload: event.target.value }))} aria-label="Filter packet payload">
          <option value="">All payloads</option>
          {payloadOptions.map((payload) => <option key={payload} value={payload}>{payloadVisual(payload).label}</option>)}
        </select>
        <select value={filters.minHops} onChange={(event) => setFilters((current) => ({ ...current, minHops: Number(event.target.value) || 0 }))} aria-label="Filter minimum hops">
          <option value={0}>Any hops</option>
          <option value={2}>2+ hops</option>
          <option value={3}>3+ hops</option>
          <option value={5}>5+ hops</option>
        </select>
        <label className="packets-checkbox">
          <input type="checkbox" checked={filters.messageOnly} onChange={(event) => setFilters((current) => ({ ...current, messageOnly: event.target.checked }))} />
          <span>Messages</span>
        </label>
        <div className="packets-scopes" aria-label="Packet history window">
          {PACKETS_SCOPE_OPTIONS.map((option) => (
            <button key={option.label} type="button" className={scopeMs === option.value ? 'active' : ''} onClick={() => setScopeMs(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="packets-error" role="alert">{error}</div>}
      {loading && packets.length === 0 && <div className="packets-loading">Loading true path packets...</div>}

      <div className="packets-list" role="list" aria-label="True path packet rows">
        {visiblePackets.map((packet) => (
          <PacketRow
            key={packet.id}
            packet={packet}
            selected={packet.id === selectedPacketID}
            onSelect={onSelectPacket}
            onReplay={onReplayPacket}
          />
        ))}
        {!loading && visiblePackets.length === 0 && (
          <div className="packets-empty">No true path packets match the current filters.</div>
        )}
      </div>

      <footer className="packets-footer">
        <span>{selectedPacket ? `Selected ${packetEndpointSummary(selectedPacket)}` : 'Select a packet to focus its real path on the map.'}</span>
        <button type="button" disabled={!nextCursor || loadingMore} onClick={loadOlder}>
          {loadingMore ? 'Loading...' : nextCursor ? 'Load older' : 'No older page'}
        </button>
      </footer>
    </section>
  );
}

function PacketRow({
  packet,
  selected,
  onSelect,
  onReplay
}: {
  packet: PublicPacketPath;
  selected: boolean;
  onSelect: (packet: PublicPacketPath) => void;
  onReplay: (packet: PublicPacketPath) => void;
}) {
  const visual = payloadVisual(packet.payloadTypeName);
  const path = packetEndpointSummary(packet);
  return (
    <article className={`packet-row ${selected ? 'selected' : ''}`} role="listitem">
      <button type="button" className="packet-row-main" onClick={() => onSelect(packet)} title="Focus this packet path on the map">
        <span className="packet-row-top">
          <span className="packet-payload" style={{ '--packet-color': visual.color } as CSSProperties}>
            <i />
            {visual.shortLabel}
          </span>
          <strong>{path}</strong>
          <em>{formatRelative(packet.at)}</em>
        </span>
        <span className="packet-row-meta">
          <span>{packet.iata || 'unknown'}</span>
          <span>{packet.hopCount} {packet.hopCount === 1 ? 'hop' : 'hops'}</span>
          <span>{packet.distanceKm.toFixed(1)} km</span>
          <span>{packet.segmentCount} {packet.segmentCount === 1 ? 'segment' : 'segments'}</span>
        </span>
        {packet.messageText && (
          <span className="packet-message-preview">
            {packet.messageSender && <b>{packet.messageSender}: </b>}
            {packet.messageText}
          </span>
        )}
      </button>
      <button type="button" className="packet-replay-button" onClick={() => onReplay(packet)} title="Replay this packet comet on the map">
        <Play size={15} />
        <span>Replay</span>
      </button>
    </article>
  );
}

function PacketSummary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="packet-summary">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function dedupePackets(items: PublicPacketPath[]): PublicPacketPath[] {
  const seen = new Set<string>();
  const out: PublicPacketPath[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatWindow(window: PublicHistoryWindow | null): string {
  if (!window) return 'loading';
  const span = Math.max(0, window.to - window.from);
  if (span >= 23 * 60 * 60_000) return '24h';
  if (span >= 5 * 60 * 60_000) return '6h';
  return '1h';
}

function formatRelative(at: number, now = Date.now()): string {
  const age = Math.max(0, now - at);
  if (age < 60_000) return `${Math.max(1, Math.round(age / 1000))}s ago`;
  if (age < 3_600_000) return `${Math.round(age / 60_000)}m ago`;
  return `${Math.round(age / 3_600_000)}h ago`;
}
