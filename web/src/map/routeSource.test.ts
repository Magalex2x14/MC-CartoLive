import { describe, expect, it } from 'vitest';
import type { PublicRoute, PublicRouteEndpoint } from '../types';
import type { NodeFocus } from './nodeFocus';
import {
  pruneRoutePayloadGlows,
  routeColorSignature,
  routePayloadGlowsToGeoJSON,
  routeSourceSignature,
  routesToGeoJSON,
  type RoutePayloadGlow
} from './routeSource';

const endpoint = (nodeId: string, lat = 43, lng = -79): PublicRouteEndpoint => ({
  nodeId,
  label: nodeId.toUpperCase(),
  lat,
  lng,
  pathHash3: `${nodeId}${nodeId}${nodeId}${nodeId}${nodeId}${nodeId}`.slice(0, 6).toUpperCase()
});

const route = (id: string, from: string, to: string, bucket = 1, packetCount = 10, lastHeard = 100): PublicRoute => ({
  id,
  from: endpoint(from),
  to: endpoint(to),
  distanceKm: 1,
  packetCount,
  lastHeard,
  frequencyBucket: bucket,
  payloadTypeNames: ['GROUP_TEXT']
});

const focus = (overrides: Partial<NodeFocus> = {}): NodeFocus => ({
  selectedNodeID: null,
  connectedRouteIDs: new Set(),
  neighbourNodeIDs: new Set(),
  pathRouteIDs: new Set(),
  pathNodeIDs: new Set(),
  neighbourDistanceKmByNodeID: new Map(),
  ...overrides
});

describe('route source helpers', () => {
  it('ignores volatile route counters in render signatures', () => {
    const base = [route('a-b', 'a', 'b', 1, 10, 100)];
    const updatedCounters = [route('a-b', 'a', 'b', 1, 999, 5000)];
    const updatedBucket = [route('a-b', 'a', 'b', 2, 999, 5000)];

    expect(routeSourceSignature(base, null, focus())).toBe(routeSourceSignature(updatedCounters, null, focus()));
    expect(routeSourceSignature(base, null, focus())).not.toBe(routeSourceSignature(updatedBucket, null, focus()));
  });

  it('ignores live route sort order churn in render signatures', () => {
    const first = [route('a-b', 'a', 'b', 1), route('c-d', 'c', 'd', 2)];
    const reordered = [route('c-d', 'c', 'd', 2, 500), route('a-b', 'a', 'b', 1, 10)];

    expect(routeSourceSignature(first, null, focus())).toBe(routeSourceSignature(reordered, null, focus()));
    expect(routeColorSignature(first)).toBe(routeColorSignature(reordered));
  });

  it('includes focus state in render signatures', () => {
    const routes = [route('a-b', 'a', 'b')];

    expect(routeSourceSignature(routes, null, focus())).not.toBe(
      routeSourceSignature(routes, null, focus({ selectedNodeID: 'a', connectedRouteIDs: new Set(['a-b']) }))
    );
  });

  it('marks connected routes and dims unrelated routes', () => {
    const data = routesToGeoJSON(
      [route('a-b', 'a', 'b'), route('c-d', 'c', 'd')],
      null,
      focus({ selectedNodeID: 'a', connectedRouteIDs: new Set(['a-b']) })
    );

    expect(data.features[0].properties).toMatchObject({ id: 'a-b', connected: true, dimmed: false });
    expect(data.features[1].properties).toMatchObject({ id: 'c-d', connected: false, dimmed: true });
  });

  it('builds payload glow GeoJSON only for active route glows', () => {
    const now = 1000;
    const glows = new Map<string, RoutePayloadGlow>([
      ['a-b', { color: '#22c55e', startedAt: now - 100, expiresAt: now + 900 }],
      ['missing', { color: '#ef4444', startedAt: now - 100, expiresAt: now + 900 }]
    ]);

    const data = routePayloadGlowsToGeoJSON([route('a-b', 'a', 'b')], glows, null, focus(), now);

    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties).toMatchObject({ id: 'a-b', color: '#22c55e' });
  });

  it('prunes expired payload glows', () => {
    const glows = new Map<string, RoutePayloadGlow>([
      ['a-b', { color: '#22c55e', startedAt: 0, expiresAt: 10 }],
      ['b-c', { color: '#38bdf8', startedAt: 95, expiresAt: 200 }]
    ]);

    expect(pruneRoutePayloadGlows(glows, 100)).toBe(1);
    expect([...glows.keys()]).toEqual(['b-c']);
  });

  it('tracks route color changes separately from packet counters', () => {
    expect(routeColorSignature([route('a-b', 'a', 'b', 1, 10)])).toBe(routeColorSignature([route('a-b', 'a', 'b', 1, 999)]));
    expect(routeColorSignature([route('a-b', 'a', 'b', 1)])).not.toBe(routeColorSignature([route('a-b', 'a', 'b', 3)]));
  });
});
