import type { LiveCoverageStats } from '../state';
import type { PublicStats } from '../types';

export const STALE_PACKET_MS = 60_000;

export function serverStatus(stats: PublicStats | null, socketStatus: string, coverage: LiveCoverageStats): { label: 'Live' | 'Stale'; live: boolean } {
  const transportFailed = socketStatus === 'closed' || socketStatus === 'state-error' || socketStatus === 'bad-message';
  const live = Boolean(stats?.mqttConnected) && !transportFailed && coverage.lastPacketAgeMs !== null && coverage.lastPacketAgeMs < STALE_PACKET_MS;
  return { label: live ? 'Live' : 'Stale', live };
}

export function formatPacketsTotal(count: number | undefined | null): string {
  return `${(count ?? 0).toLocaleString()} packets total`;
}
