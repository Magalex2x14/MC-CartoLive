import { describe, expect, it } from 'vitest';
import type { PublicNode } from '../types';
import { emptyNodeFocus, nodeFocusFromRoutes } from './nodeFocus';
import { nodeSourceSignature } from './nodeSource';

describe('node source signatures', () => {
  it('ignores volatile packet counters and label clock churn inside a stale bucket', () => {
    const now = 10 * 60_000;
    const base = [node('a', now - 60_000, 12)];
    const updated = [node('a', now - 30_000, 999)];

    expect(nodeSourceSignature(base, emptyNodeFocus(), now, new Map())).toBe(
      nodeSourceSignature(updated, emptyNodeFocus(), now + 1000, new Map())
    );
  });

  it('changes when geometry, focus, or stale buckets change', () => {
    const now = 2 * 60 * 60_000;
    const base = [node('a', now - 60_000), node('b', now - 60_000)];
    const moved = [node('a', now - 60_000, 1, 44), node('b', now - 60_000)];
    const stale = [node('a', now - 61 * 60_000), node('b', now - 60_000)];
    const focused = nodeFocusFromRoutes('a', [
      {
        id: 'a-b',
        from: { nodeId: 'a', label: 'A', lat: 43, lng: -79 },
        to: { nodeId: 'b', label: 'B', lat: 43.5, lng: -79.5 },
        distanceKm: 50,
        packetCount: 1,
        lastHeard: now,
        frequencyBucket: 1,
        payloadTypeNames: ['PLAIN_TEXT']
      }
    ]);

    const baseSignature = nodeSourceSignature(base, emptyNodeFocus(), now, new Map());
    expect(nodeSourceSignature(moved, emptyNodeFocus(), now, new Map())).not.toBe(baseSignature);
    expect(nodeSourceSignature(stale, emptyNodeFocus(), now, new Map())).not.toBe(baseSignature);
    expect(nodeSourceSignature(base, focused, now, new Map())).not.toBe(baseSignature);
  });
});

function node(id: string, lastSeen: number, activityCount = 1, latitude = 43): PublicNode {
  return {
    id,
    label: id.toUpperCase(),
    role: 'repeater',
    latitude,
    longitude: -79,
    lastSeen,
    firstSeen: lastSeen - 1000,
    iatasHeardIn: ['YYZ'],
    activityCount
  };
}
