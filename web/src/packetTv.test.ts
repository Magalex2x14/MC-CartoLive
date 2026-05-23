import { describe, expect, it } from 'vitest';
import type { PublicRoutePulse } from './types';
import {
  comparePacketTvCandidates,
  packetTvCandidateFromPulse,
  packetTvEndpointLabels,
  packetTvPulseDistanceKm,
  selectPacketTvPulse
} from './packetTv';

describe('PacketTV pulse selection', () => {
  it('sums segment distance and falls back to coordinates', () => {
    expect(packetTvPulseDistanceKm(pulse('a', [10, 12]))).toBe(22);
    const fallback = packetTvPulseDistanceKm({
      ...pulse('b', []),
      segments: [
        {
          routeId: 'r1',
          from: { nodeId: 'a', label: 'A', lat: 43.65, lng: -79.38 },
          to: { nodeId: 'b', label: 'B', lat: 45.42, lng: -75.69 },
          distanceKm: 0
        }
      ]
    });
    expect(fallback).toBeGreaterThan(340);
  });

  it('prioritizes longest routes, then hop count, then recency', () => {
    const shortRecent = packetTvCandidateFromPulse(pulse('short', [15], 3000));
    const longOld = packetTvCandidateFromPulse(pulse('long', [60], 1000));
    const sameDistanceMoreHops = packetTvCandidateFromPulse(pulse('hops', [30, 30], 2000));
    const candidates = [shortRecent, longOld, sameDistanceMoreHops].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    expect(candidates.sort(comparePacketTvCandidates)[0]?.pulse.id).toBe('hops');
  });

  it('ignores stale and observer-only activity', () => {
    const now = 10_000;
    expect(selectPacketTvPulse([pulse('stale', [150], 1)], now, 1000)).toBeNull();
    expect(selectPacketTvPulse([{ ...pulse('empty', [], now), segments: [] }], now)).toBeNull();
    expect(selectPacketTvPulse([pulse('fresh', [42], now)], now)?.pulse.id).toBe('fresh');
  });

  it('uses public sender and endpoint labels only', () => {
    const labels = packetTvEndpointLabels({ ...pulse('msg', [25]), messageSender: '  VE3 Sender  ' });
    expect(labels.sender).toBe('VE3 Sender');
    expect(labels.destination).toBe('node-0');
  });
});

function pulse(id: string, distances: number[], timestamp = 1000): PublicRoutePulse {
  return {
    id,
    payloadTypeName: 'PLAIN_TEXT',
    heardAt: timestamp,
    displayAt: timestamp,
    segments: distances.map((distance, index) => ({
      routeId: `route-${id}-${index}`,
      from: { nodeId: `from-${index}`, label: `from-${index}`, lat: 43 + index, lng: -80 - index },
      to: { nodeId: `node-${index}`, label: `node-${index}`, lat: 43.5 + index, lng: -79.5 - index },
      distanceKm: distance
    }))
  };
}
