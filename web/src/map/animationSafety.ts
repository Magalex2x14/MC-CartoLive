export const MAX_ANIMATION_EVENT_AGE_MS = 30_000;
export const MAX_ANIMATION_EVENT_FUTURE_SKEW_MS = 10_000;

export function shouldAnimateLiveEvent(heardAt: number, now: number, documentHidden: boolean): boolean {
  if (documentHidden) return false;
  if (!Number.isFinite(heardAt) || heardAt <= 0) return false;
  if (heardAt - now > MAX_ANIMATION_EVENT_FUTURE_SKEW_MS) return false;
  return now - heardAt <= MAX_ANIMATION_EVENT_AGE_MS;
}
