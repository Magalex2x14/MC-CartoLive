import { describe, expect, it } from 'vitest';
import {
  buildNetGraphData,
  graphSearchMatches,
  observerActivityToGraphGlow,
  routePulseToGraphComets,
  selectionForEdge,
  selectionForNode
} from './netgraph';
import type { PublicActivity, PublicNode, PublicRoute, PublicRoutePulse } from './types';

const nodes: PublicNode[] = [
  node('a', 'Alpha', 45, -75, 'repeater'),
  node('b', 'Bravo Observer', 46, -76, 'room_server', true),
  node('c', 'Charlie', 47, -77, 'companion'),
  node('orphan', 'Orphan', 48, -78, 'repeater')
];

const routes: PublicRoute[] = [
  route('r1', 'a', 'Alpha', 45, -75, 'b', 'Bravo Observer', 46, -76, 8),
  route('r1', 'a', 'Alpha duplicate', 45, -75, 'b', 'Bravo Observer', 46, -76, 1),
  route('r2', 'b', 'Bravo Observer', 46, -76, 'c', 'Charlie', 47, -77, 4)
];

describe('netgraph helpers', () => {
  it('builds connected graph nodes and excludes route-less public nodes', () => {
    const graph = buildNetGraphData(nodes, routes);
    expect(graph.nodes.map((item) => item.id).sort()).toEqual(['a', 'b', 'c']);
    expect(graph.edges.map((item) => item.id).sort()).toEqual(['r1', 'r2']);
    expect(graph.nodeByID.get('orphan')).toBeUndefined();
    expect(graph.nodeByID.get('b')).toMatchObject({ label: 'Bravo Observer', isObserver: true, degree: 2 });
  });

  it('returns direct neighbor and edge highlights for node and edge selections', () => {
    const graph = buildNetGraphData(nodes, routes);
    expect([...selectionForNode(graph, 'b').nodeIDs].sort()).toEqual(['a', 'b', 'c']);
    expect([...selectionForNode(graph, 'b').edgeIDs].sort()).toEqual(['r1', 'r2']);
    expect([...selectionForEdge(graph, 'r1').nodeIDs].sort()).toEqual(['a', 'b']);
    expect([...selectionForEdge(graph, 'r1').edgeIDs]).toEqual(['r1']);
  });

  it('maps route pulses to matching graph edge comets', () => {
    const graph = buildNetGraphData(nodes, routes);
    const pulse: PublicRoutePulse = {
      id: 'pulse-1',
      payloadTypeName: 'TEXT_MESSAGE',
      heardAt: 1,
      segments: [{
        routeId: 'r2',
        from: { nodeId: 'b', label: 'Bravo Observer', lat: 46, lng: -76 },
        to: { nodeId: 'c', label: 'Charlie', lat: 47, lng: -77 },
        distanceKm: 32
      }]
    };
    expect(routePulseToGraphComets(pulse, graph, 100)).toEqual([
      expect.objectContaining({ edgeID: 'r2', sourceID: 'b', targetID: 'c', payloadTypeName: 'TEXT_MESSAGE' })
    ]);
  });

  it('maps observer-only activity to matched graph node glows', () => {
    const graph = buildNetGraphData(nodes, routes);
    const activity: PublicActivity = {
      id: 'activity-1',
      kind: 'packet',
      payloadTypeName: 'NODEINFO_APP',
      heardAt: 1,
      hopCount: 0,
      hasRoute: false,
      animationState: 'observer',
      resolutionBucket: 'observer_only',
      observerLocation: { label: 'Bravo Observer', lat: 46.0002, lng: -76.0002 }
    };
    expect(observerActivityToGraphGlow(activity, graph, 100)).toMatchObject({ nodeID: 'b', payloadTypeName: 'NODEINFO_APP' });
    expect(observerActivityToGraphGlow({ ...activity, animationState: 'unmapped' }, graph, 100)).toBeNull();
  });

  it('searches labels, roles, IATAs, routes, and edge endpoint labels', () => {
    const graph = buildNetGraphData(nodes, routes);
    expect([...graphSearchMatches(graph, 'observer')]).toContain('b');
    expect([...graphSearchMatches(graph, 'YYZ')]).toContain('a');
    expect([...graphSearchMatches(graph, 'r2')].sort()).toEqual(['b', 'c']);
  });
});

function node(id: string, label: string, latitude: number, longitude: number, role: string, isObserver = false): PublicNode {
  return {
    id,
    label,
    role,
    isObserver,
    latitude,
    longitude,
    lastSeen: 1000,
    firstSeen: 1,
    iatasHeardIn: id === 'a' ? ['YYZ'] : ['YOW'],
    activityCount: id === 'b' ? 12 : 3
  };
}

function route(
  id: string,
  sourceID: string,
  sourceLabel: string,
  sourceLat: number,
  sourceLng: number,
  targetID: string,
  targetLabel: string,
  targetLat: number,
  targetLng: number,
  packetCount: number
): PublicRoute {
  return {
    id,
    from: { nodeId: sourceID, label: sourceLabel, lat: sourceLat, lng: sourceLng },
    to: { nodeId: targetID, label: targetLabel, lat: targetLat, lng: targetLng },
    distanceKm: 12,
    packetCount,
    lastHeard: 100,
    frequencyBucket: 1,
    payloadTypeNames: ['TEXT_MESSAGE']
  };
}
