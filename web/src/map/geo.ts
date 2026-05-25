import type { PublicNode, PublicRouteEndpoint } from '../types';

export const CANADA_MAP_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLng: -180,
  maxLng: 180
};

export function isMappableLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= CANADA_MAP_BOUNDS.minLat &&
    lat <= CANADA_MAP_BOUNDS.maxLat &&
    lng >= CANADA_MAP_BOUNDS.minLng &&
    lng <= CANADA_MAP_BOUNDS.maxLng
  );
}

export function isMappableNode(node: PublicNode): boolean {
  return isMappableLatLng(node.latitude, node.longitude);
}

export function isMappableEndpoint(endpoint: PublicRouteEndpoint): boolean {
  return isMappableLatLng(endpoint.lat, endpoint.lng);
}
