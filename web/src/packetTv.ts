import type { PublicRoutePulse, PublicRouteSegment } from './types';

export const PACKET_TV_MAX_AGE_MS = 5 * 60_000;

export interface PacketTvCandidate {
  pulse: PublicRoutePulse;
  distanceKm: number;
  hopCount: number;
  timestamp: number;
}

export function packetTvPulseDistanceKm(pulse: PublicRoutePulse): number {
  return pulse.segments.reduce((total, segment) => total + packetTvSegmentDistanceKm(segment), 0);
}

export function packetTvSegmentDistanceKm(segment: PublicRouteSegment): number {
  if (Number.isFinite(segment.distanceKm) && segment.distanceKm > 0) return segment.distanceKm;
  return haversineDistanceKm(segment.from.lat, segment.from.lng, segment.to.lat, segment.to.lng);
}

export function packetTvEndpointLabels(pulse: PublicRoutePulse): { sender: string; destination: string } {
  const first = pulse.segments[0];
  const last = pulse.segments.at(-1);
  return {
    sender: compactEndpointLabel(pulse.messageSender || first?.from.label || 'Sender'),
    destination: compactEndpointLabel(last?.to.label || 'Destination')
  };
}

export function packetTvCandidateFromPulse(pulse: PublicRoutePulse): PacketTvCandidate | null {
  if (pulse.segments.length === 0) return null;
  const distanceKm = packetTvPulseDistanceKm(pulse);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return {
    pulse,
    distanceKm,
    hopCount: pulse.segments.length,
    timestamp: pulse.displayAt ?? pulse.receivedAt ?? pulse.heardAt
  };
}

export function selectPacketTvPulse(pulses: PublicRoutePulse[], now = Date.now(), maxAgeMs = PACKET_TV_MAX_AGE_MS): PacketTvCandidate | null {
  const candidates = pulses
    .map(packetTvCandidateFromPulse)
    .filter((candidate): candidate is PacketTvCandidate => Boolean(candidate))
    .filter((candidate) => now - candidate.timestamp <= maxAgeMs);
  return candidates.sort(comparePacketTvCandidates)[0] ?? null;
}

export function comparePacketTvCandidates(a: PacketTvCandidate, b: PacketTvCandidate): number {
  const distanceDelta = b.distanceKm - a.distanceKm;
  if (Math.abs(distanceDelta) > 0.001) return distanceDelta;
  const hopDelta = b.hopCount - a.hopCount;
  if (hopDelta !== 0) return hopDelta;
  return b.timestamp - a.timestamp;
}

function compactEndpointLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').slice(0, 42) || 'Unknown';
}

function haversineDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return 0;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
