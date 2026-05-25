import type { PublicRoute, PublicRoutePulse } from '../types';
import { isMappableEndpoint } from './geo';
import type { NodeFocus } from './nodeFocus';
import { routeColors } from './routeSource';
import type { FeatureCollection } from './sourceDataQueue';

export function analysisRoutesToGeoJSON(
  routes: PublicRoute[],
  selectedRouteID: string | null,
  focus: NodeFocus,
  analysisSegments: PublicRoutePulse['segments']
): FeatureCollection {
  const features: Array<Record<string, unknown>> = [];
  const routeIDs = new Set<string>([...focus.pathRouteIDs, ...focus.connectedRouteIDs]);
  if (selectedRouteID) routeIDs.add(selectedRouteID);
  for (const route of routes) {
    if (!routeIDs.has(route.id)) continue;
    const path = focus.pathRouteIDs.has(route.id);
    const selected = route.id === selectedRouteID;
    const connected = focus.connectedRouteIDs.has(route.id);
    const color = selected ? '#f8fafc' : path ? '#facc15' : connected ? '#67e8f9' : routeColors[Math.max(0, Math.min(4, route.frequencyBucket))];
    features.push(lineFeature(route.id, route.from.lng, route.from.lat, route.to.lng, route.to.lat, {
      color,
      opacity: selected ? 0.96 : path ? 0.9 : 0.72,
      glowOpacity: selected ? 0.34 : path ? 0.28 : 0.18
    }));
  }
  for (const [index, segment] of analysisSegments.entries()) {
    if (!isMappableEndpoint(segment.from) || !isMappableEndpoint(segment.to)) continue;
    features.push(lineFeature(`packet-${segment.routeId}-${index}`, segment.from.lng, segment.from.lat, segment.to.lng, segment.to.lat, {
      color: '#facc15',
      opacity: 0.94,
      glowOpacity: 0.32
    }));
  }
  return { type: 'FeatureCollection', features };
}

function lineFeature(id: string, fromLng: number, fromLat: number, toLng: number, toLat: number, properties: Record<string, unknown>) {
  return {
    type: 'Feature',
    id,
    properties: { id, ...properties },
    geometry: {
      type: 'LineString',
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat]
      ]
    }
  };
}
