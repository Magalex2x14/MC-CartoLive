import { describe, expect, it } from 'vitest';
import type { PublicLiveEnvelope } from './types';
import { nextLiveEnvelopeDelayMs, sortLiveEnvelopes, takeDueLiveEnvelopes } from './livePacing';

const event = (id: string, displayAt: number, seq: number): PublicLiveEnvelope => ({
  v: 1,
  type: 'event',
  event: 'activity',
  seq,
  serverTime: displayAt,
  displayAt,
  data: {
    id,
    kind: 'packet',
    payloadTypeName: 'ADVERT',
    heardAt: displayAt,
    hopCount: 0,
    hasRoute: false,
    animationState: 'unmapped',
    resolutionBucket: 'missing_location'
  }
});

describe('live envelope pacing', () => {
  it('sorts by display time and then websocket sequence', () => {
    const messages = [event('late', 1200, 1), event('first', 1000, 9), event('tie', 1000, 3)];

    expect(sortLiveEnvelopes(messages).map((message) => (message.type === 'event' ? message.data.id : message.type))).toEqual(['tie', 'first', 'late']);
  });

  it('keeps future envelopes pending so bursts tick through the UI', () => {
    const messages = [event('ready', 1000, 1), event('near', 1024, 2), event('future', 1180, 3)];

    const { due, pending } = takeDueLiveEnvelopes(messages, 1000, 28, 18);

    expect(due.map((message) => (message.type === 'event' ? message.data.id : message.type))).toEqual(['ready', 'near']);
    expect(pending.map((message) => (message.type === 'event' ? message.data.id : message.type))).toEqual(['future']);
  });

  it('caps a due batch to avoid one large websocket burst blocking the frame', () => {
    const messages = Array.from({ length: 6 }, (_, index) => event(`m-${index}`, 1000, index));

    const { due, pending } = takeDueLiveEnvelopes(messages, 1000, 28, 3);

    expect(due).toHaveLength(3);
    expect(pending).toHaveLength(3);
    expect(nextLiveEnvelopeDelayMs(pending, 1000)).toBe(0);
  });
});
