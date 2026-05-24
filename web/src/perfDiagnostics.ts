export interface PerfCounters {
  packetActiveComets: number;
  packetActiveObserverBursts: number;
  packetFrameMs: number;
  packetSkippedFrames: number;
  routeSourceUpdates: number;
  nodeSourceUpdates: number;
  otherSourceUpdates: number;
  vcrReplayQueueSize: number;
}

const STORAGE_KEY = 'mc-cartolive-debug-perf';

declare global {
  interface Window {
    __mcCartoLivePerf?: PerfCounters;
  }
}

export function perfDiagnosticsEnabled(storage: Storage | undefined = safeStorage()): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true;
  try {
    return storage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function ensurePerfDiagnostics(): PerfCounters | null {
  if (typeof window === 'undefined' || !perfDiagnosticsEnabled()) return null;
  const existing = window.__mcCartoLivePerf;
  if (existing) return existing;
  const counters: PerfCounters = {
    packetActiveComets: 0,
    packetActiveObserverBursts: 0,
    packetFrameMs: 0,
    packetSkippedFrames: 0,
    routeSourceUpdates: 0,
    nodeSourceUpdates: 0,
    otherSourceUpdates: 0,
    vcrReplayQueueSize: 0
  };
  window.__mcCartoLivePerf = counters;
  return counters;
}

export function recordSourceUpdate(sourceID: string): void {
  const counters = ensurePerfDiagnostics();
  if (!counters) return;
  if (sourceID.includes('route') && !sourceID.includes('payload')) {
    counters.routeSourceUpdates += 1;
  } else if (sourceID.includes('node')) {
    counters.nodeSourceUpdates += 1;
  } else {
    counters.otherSourceUpdates += 1;
  }
}

export function recordPacketFrame(activeComets: number, activeObserverBursts: number, frameMs: number): void {
  const counters = ensurePerfDiagnostics();
  if (!counters) return;
  counters.packetActiveComets = activeComets;
  counters.packetActiveObserverBursts = activeObserverBursts;
  counters.packetFrameMs = Math.max(0, Math.round(frameMs * 10) / 10);
}

export function recordPacketSkippedFrame(): void {
  const counters = ensurePerfDiagnostics();
  if (!counters) return;
  counters.packetSkippedFrames += 1;
}

export function recordVcrReplayQueueSize(size: number): void {
  const counters = ensurePerfDiagnostics();
  if (!counters) return;
  counters.vcrReplayQueueSize = Math.max(0, Math.floor(size));
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
