import { describe, expect, it } from 'vitest';
import { WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS, reconnectDelayMs } from './ws';

describe('public websocket reconnect backoff', () => {
  it('uses capped exponential backoff with bounded jitter', () => {
    expect(reconnectDelayMs(0, () => 0)).toBe(WS_RECONNECT_BASE_MS);
    expect(reconnectDelayMs(1, () => 0)).toBe(WS_RECONNECT_BASE_MS * 2);
    expect(reconnectDelayMs(20, () => 0)).toBe(WS_RECONNECT_MAX_MS);
    expect(reconnectDelayMs(20, () => 0.99)).toBeLessThan(WS_RECONNECT_MAX_MS + 500);
  });
});
