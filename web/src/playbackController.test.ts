import { describe, expect, it } from 'vitest';
import { appendBufferedRoutePulses, routePulseMessages } from './playbackController';
import type { PublicLiveEnvelope } from './types';

function envelope(id: string, event: 'routePulse' | 'activity', displayAt: number): PublicLiveEnvelope {
  if (event === 'routePulse') {
    return {
      v: 1,
      type: 'event',
      event,
      displayAt,
      receivedAt: displayAt,
      serverTime: displayAt,
      data: { id, payloadTypeName: 'PLAIN_TEXT', heardAt: displayAt, segments: [] }
    };
  }
  return {
    v: 1,
    type: 'event',
    event,
    displayAt,
    receivedAt: displayAt,
    serverTime: displayAt,
    data: {
      id,
      kind: 'packet',
      payloadTypeName: 'PLAIN_TEXT',
      heardAt: displayAt,
      hopCount: 0,
      hasRoute: false,
      animationState: 'observer',
      resolutionBucket: 'observer_only'
    }
  };
}

describe('playbackController', () => {
  it('buffers only route pulse envelopes for missed replay', () => {
    const input = [envelope('activity-1', 'activity', 2), envelope('pulse-1', 'routePulse', 1)];
    expect(routePulseMessages(input).map((item) => item.type === 'event' && item.event === 'routePulse' ? item.data.id : '')).toEqual(['pulse-1']);
  });

  it('keeps buffered route pulses sorted and capped', () => {
    const current = [envelope('old', 'routePulse', 1)];
    const next = appendBufferedRoutePulses(current, [envelope('newer', 'routePulse', 3), envelope('middle', 'routePulse', 2)], 2);
    expect(next.map((item) => item.type === 'event' && item.event === 'routePulse' ? item.data.id : '')).toEqual(['middle', 'newer']);
  });

  it('returns the same buffer when no route pulses are added', () => {
    const current = [envelope('old', 'routePulse', 1)];
    expect(appendBufferedRoutePulses(current, envelope('activity-1', 'activity', 2), 10)).toBe(current);
  });
});
