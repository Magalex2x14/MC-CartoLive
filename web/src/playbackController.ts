import { sortLiveEnvelopes } from './livePacing';
import type { PublicLiveEnvelope } from './types';

export function routePulseMessages(messages: PublicLiveEnvelope[]): PublicLiveEnvelope[] {
  return messages.filter((message) => message.type === 'event' && message.event === 'routePulse');
}

export function appendBufferedRoutePulses(
  current: PublicLiveEnvelope[],
  incoming: PublicLiveEnvelope | PublicLiveEnvelope[],
  maxItems: number
): PublicLiveEnvelope[] {
  const additions = routePulseMessages(Array.isArray(incoming) ? incoming : [incoming]);
  if (additions.length === 0) return current;
  return sortLiveEnvelopes([...current, ...additions]).slice(-maxItems);
}
