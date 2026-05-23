import { describe, expect, it } from 'vitest';
import { MAX_ANIMATION_EVENT_AGE_MS, MAX_ANIMATION_EVENT_FUTURE_SKEW_MS, shouldAnimateLiveEvent } from './animationSafety';

describe('animation safety', () => {
  it('drops hidden-tab and stale animation events', () => {
    const now = 60_000;

    expect(shouldAnimateLiveEvent(now - 1000, now, false)).toBe(true);
    expect(shouldAnimateLiveEvent(now - MAX_ANIMATION_EVENT_AGE_MS, now, false)).toBe(true);
    expect(shouldAnimateLiveEvent(now - MAX_ANIMATION_EVENT_AGE_MS - 1, now, false)).toBe(false);
    expect(shouldAnimateLiveEvent(now + MAX_ANIMATION_EVENT_FUTURE_SKEW_MS, now, false)).toBe(true);
    expect(shouldAnimateLiveEvent(now + MAX_ANIMATION_EVENT_FUTURE_SKEW_MS + 1, now, false)).toBe(false);
    expect(shouldAnimateLiveEvent(now - 1000, now, true)).toBe(false);
    expect(shouldAnimateLiveEvent(0, now, false)).toBe(false);
  });
});
