import type { PublicRouteEndpoint, PublicRoutePulse } from '../types';

export interface ArcEndpoint {
  lat: number;
  lng: number;
}

export interface ArcSample {
  lng: number;
  lat: number;
  altitudeMeters: number;
  progress: number;
}

export interface ArcOptions {
  distanceKm?: number;
  minSamples?: number;
  maxSamples?: number;
  heightScale?: number;
}

export const ARC_MIN_HEIGHT_M = 180;
export const ARC_MAX_HEIGHT_M = 18_000;
export const ARC_DEFAULT_MIN_SAMPLES = 8;
export const ARC_DEFAULT_MAX_SAMPLES = 34;

export function routeArcHeightMeters(distanceKm: number, heightScale = 1): number {
  const distance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const base = ARC_MIN_HEIGHT_M + Math.sqrt(distance) * 420 + distance * 12;
  return Math.round(clamp(base * clamp(heightScale, 0.2, 2), ARC_MIN_HEIGHT_M, ARC_MAX_HEIGHT_M));
}

export function routeArcSampleCount(distanceKm: number, minSamples = ARC_DEFAULT_MIN_SAMPLES, maxSamples = ARC_DEFAULT_MAX_SAMPLES): number {
  const distance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  return Math.round(clamp(8 + Math.sqrt(distance) * 1.6, minSamples, maxSamples));
}

export function sampleRouteArc(from: ArcEndpoint, to: ArcEndpoint, options: ArcOptions = {}): ArcSample[] {
  const distanceKm = options.distanceKm ?? haversineKm(from, to);
  const count = routeArcSampleCount(distanceKm, options.minSamples, options.maxSamples);
  const height = routeArcHeightMeters(distanceKm, options.heightScale);
  const samples: ArcSample[] = [];
  for (let index = 0; index < count; index++) {
    const progress = count <= 1 ? 1 : index / (count - 1);
    const bend = Math.sin(progress * Math.PI);
    samples.push({
      lng: interpolate(from.lng, to.lng, progress),
      lat: interpolate(from.lat, to.lat, progress),
      altitudeMeters: height * bend,
      progress
    });
  }
  return samples;
}

export function routeArcCoordinates(from: ArcEndpoint, to: ArcEndpoint, options: ArcOptions = {}): Array<[number, number]> {
  return sampleRouteArc(from, to, options).map((sample) => [sample.lng, sample.lat]);
}

export function routeSegmentArcCoordinates(segment: PublicRoutePulse['segments'][number], options: ArcOptions = {}): Array<[number, number]> {
  return routeArcCoordinates(segment.from, segment.to, { distanceKm: segment.distanceKm, ...options });
}

export function routeEndpointDistanceKm(from: ArcEndpoint, to: ArcEndpoint): number {
  return haversineKm(from, to);
}

export function arcPointAt(samples: ArcSample[], progress: number): ArcSample | null {
  if (samples.length === 0) return null;
  if (samples.length === 1) return samples[0];
  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (samples.length - 1);
  const index = Math.min(samples.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = samples[index];
  const b = samples[index + 1];
  return {
    lng: interpolate(a.lng, b.lng, local),
    lat: interpolate(a.lat, b.lat, local),
    altitudeMeters: interpolate(a.altitudeMeters, b.altitudeMeters, local),
    progress: clamped
  };
}

export function arcTrailSamples(samples: ArcSample[], headProgress: number, trailProgress: number): ArcSample[] {
  if (samples.length === 0) return [];
  const head = clamp(headProgress, 0, 1);
  const tail = clamp(head - Math.max(0.015, trailProgress), 0, head);
  const output: ArcSample[] = [];
  const tailPoint = arcPointAt(samples, tail);
  const headPoint = arcPointAt(samples, head);
  if (tailPoint) output.push(tailPoint);
  for (const sample of samples) {
    if (sample.progress > tail && sample.progress < head) output.push(sample);
  }
  if (headPoint) output.push(headPoint);
  return output;
}

export function publicEndpointKey(endpoint: PublicRouteEndpoint): string {
  return endpoint.nodeId || `${endpoint.label}|${endpoint.lat.toFixed(5)}|${endpoint.lng.toFixed(5)}`;
}

function haversineKm(from: ArcEndpoint, to: ArcEndpoint): number {
  const earthKm = 6371;
  const dLat = degToRad(to.lat - from.lat);
  const dLng = degToRad(to.lng - from.lng);
  const lat1 = degToRad(from.lat);
  const lat2 = degToRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function interpolate(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
