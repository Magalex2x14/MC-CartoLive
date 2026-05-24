import type { PublicLiveEnvelope } from './types';

export const LIVE_ENVELOPE_BATCH_WINDOW_MS = 28;
export const LIVE_ENVELOPE_MAX_WAIT_MS = 240;
export const LIVE_ENVELOPE_MAX_BATCH_SIZE = 18;
export const LIVE_ENVELOPE_MAX_PENDING = 900;

export interface DueLiveEnvelopes {
  due: PublicLiveEnvelope[];
  pending: PublicLiveEnvelope[];
}

export function liveEnvelopeDisplayAt(message: PublicLiveEnvelope): number {
  return message.displayAt ?? message.receivedAt ?? message.serverTime ?? 0;
}

export function sortLiveEnvelopes(messages: PublicLiveEnvelope[]): PublicLiveEnvelope[] {
  return messages.slice().sort(compareLiveEnvelopes);
}

export function capLiveEnvelopeQueue(messages: PublicLiveEnvelope[], limit = LIVE_ENVELOPE_MAX_PENDING): PublicLiveEnvelope[] {
  if (messages.length <= limit) return messages;
  return sortLiveEnvelopes(messages).slice(-Math.max(0, limit));
}

export function takeDueLiveEnvelopes(
  messages: PublicLiveEnvelope[],
  now: number,
  batchWindowMs = LIVE_ENVELOPE_BATCH_WINDOW_MS,
  maxBatchSize = LIVE_ENVELOPE_MAX_BATCH_SIZE
): DueLiveEnvelopes {
  const cutoff = now + batchWindowMs;
  const due: PublicLiveEnvelope[] = [];
  const pending: PublicLiveEnvelope[] = [];

  for (const message of sortLiveEnvelopes(messages)) {
    if (due.length < maxBatchSize && liveEnvelopeDisplayAt(message) <= cutoff) {
      due.push(message);
    } else {
      pending.push(message);
    }
  }

  return { due, pending };
}

export function nextLiveEnvelopeDelayMs(messages: PublicLiveEnvelope[], now: number): number | null {
  if (messages.length === 0) return null;
  const nextDisplayAt = Math.min(...messages.map(liveEnvelopeDisplayAt));
  return Math.max(0, Math.min(LIVE_ENVELOPE_MAX_WAIT_MS, nextDisplayAt - now));
}

function compareLiveEnvelopes(a: PublicLiveEnvelope, b: PublicLiveEnvelope): number {
  return liveEnvelopeDisplayAt(a) - liveEnvelopeDisplayAt(b) || (a.seq ?? 0) - (b.seq ?? 0);
}
