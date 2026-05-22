import { describe, expect, it } from 'vitest';
import type { PublicRoute, PublicRouteEndpoint } from '../types';
import { nodeFocusFromRoutes } from './nodeFocus';

const endpoint = (nodeId: string): PublicRouteEndpoint => ({
  nodeId,
  label: nodeId,
  lat: 43,
  lng: -79
});

const route = (id: string, from: string, to: string, distanceKm: number): PublicRoute => ({
  id,
  from: endpoint(from),
  to: endpoint(to),
  distanceKm,
  packetCount: 1,
  lastHeard: 1,
  frequencyBucket: 1,
  payloadTypeNames: ['GROUP_TEXT']
});

describe('node focus', () => {
  it('returns connected route IDs, direct neighbours, and closest leg distances', () => {
    const focus = nodeFocusFromRoutes('a', [
      route('a-b-long', 'a', 'b', 12),
      route('a-c', 'c', 'a', 7.4),
      route('b-c', 'b', 'c', 4),
      route('a-b-short', 'a', 'b', 9.2)
    ]);

    expect(focus.selectedNodeID).toBe('a');
    expect([...focus.connectedRouteIDs].sort()).toEqual(['a-b-long', 'a-b-short', 'a-c']);
    expect([...focus.neighbourNodeIDs].sort()).toEqual(['b', 'c']);
    expect(focus.neighbourDistanceKmByNodeID.get('b')).toBe(9.2);
    expect(focus.neighbourDistanceKmByNodeID.get('c')).toBe(7.4);
    expect(focus.pathRouteIDs.size).toBe(0);
    expect(focus.pathNodeIDs.size).toBe(0);
  });

  it('returns empty focus data without a selected node', () => {
    const focus = nodeFocusFromRoutes(null, [route('a-b', 'a', 'b', 12)]);

    expect(focus.selectedNodeID).toBeNull();
    expect(focus.connectedRouteIDs.size).toBe(0);
    expect(focus.neighbourNodeIDs.size).toBe(0);
    expect(focus.neighbourDistanceKmByNodeID.size).toBe(0);
  });

  it('preserves highlighted path route and node IDs', () => {
    const focus = nodeFocusFromRoutes('a', [route('a-b', 'a', 'b', 12)], new Set(['a-b']), new Set(['a', 'b']));

    expect([...focus.pathRouteIDs]).toEqual(['a-b']);
    expect([...focus.pathNodeIDs]).toEqual(['a', 'b']);
  });
});
