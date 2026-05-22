import { payloadVisual } from '../payloadVisuals';

export const CLUSTER_ACTIVITY_GLOW_MS = 5_200;
export const CLUSTER_ACTIVITY_UPDATE_MS = 100;
export const CLUSTER_ACTIVITY_QUERY_RADIUS_PX = 72;

export type ClusterID = string | number;

export interface ClusterActivityTarget {
  clusterID: ClusterID;
  pointCount: number;
  lng: number;
  lat: number;
  x: number;
  y: number;
}

export interface ClusterActivityGlow {
  id: string;
  clusterID: ClusterID;
  color: string;
  pointCount: number;
  lng: number;
  lat: number;
  startedAt: number;
  expiresAt: number;
}

export interface ClusterActivityFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    properties: {
      id: string;
      color: string;
      intensity: number;
      pointCount: number;
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;
}

export function clusterActivityGlowID(clusterID: ClusterID): string {
  return `cluster-${String(clusterID)}`;
}

export function nearestClusterTarget(targets: ClusterActivityTarget[], x: number, y: number): ClusterActivityTarget | null {
  let nearest: ClusterActivityTarget | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = Math.hypot(target.x - x, target.y - y);
    if (distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function upsertClusterActivityGlow(
  glows: Map<string, ClusterActivityGlow>,
  target: ClusterActivityTarget,
  payloadTypeName: string,
  now: number,
  durationMs = CLUSTER_ACTIVITY_GLOW_MS
): string {
  const id = clusterActivityGlowID(target.clusterID);
  glows.set(id, {
    id,
    clusterID: target.clusterID,
    color: payloadVisual(payloadTypeName).color,
    pointCount: target.pointCount,
    lng: target.lng,
    lat: target.lat,
    startedAt: now,
    expiresAt: now + durationMs
  });
  return id;
}

export function clusterActivityIntensity(glow: Pick<ClusterActivityGlow, 'startedAt' | 'expiresAt'>, now: number): number {
  if (now >= glow.expiresAt) return 0;
  const duration = Math.max(1, glow.expiresAt - glow.startedAt);
  const progress = Math.max(0, Math.min(1, (now - glow.startedAt) / duration));
  return Math.pow(1 - progress, 0.74);
}

export function pruneClusterActivityGlows(glows: Map<string, ClusterActivityGlow>, now: number): number {
  let activeCount = 0;
  for (const [id, glow] of glows.entries()) {
    if (clusterActivityIntensity(glow, now) <= 0.01) {
      glows.delete(id);
      continue;
    }
    activeCount += 1;
  }
  return activeCount;
}

export function clusterActivityGlowsToGeoJSON(glows: Map<string, ClusterActivityGlow>, now: number): ClusterActivityFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: Array.from(glows.values()).flatMap((glow) => {
      const intensity = clusterActivityIntensity(glow, now);
      if (intensity <= 0.01) return [];
      return [{
        type: 'Feature',
        id: glow.id,
        properties: {
          id: glow.id,
          color: glow.color,
          intensity,
          pointCount: glow.pointCount
        },
        geometry: {
          type: 'Point',
          coordinates: [glow.lng, glow.lat]
        }
      }];
    })
  };
}
