import { describe, expect, it } from 'vitest';
import { isFollowPoint, mapViewFromMap } from './mapCamera';

describe('mapCamera', () => {
  it('accepts only finite public Canada-area follow points', () => {
    expect(isFollowPoint([-79.38, 43.65])).toBe(true);
    expect(isFollowPoint([-20, 43.65])).toBe(false);
    expect(isFollowPoint([-79.38, Number.NaN])).toBe(false);
  });

  it('builds a shareable map view snapshot', () => {
    const map = {
      getCenter: () => ({ lat: 45.42, lng: -75.69 }),
      getZoom: () => 7.5,
      getPitch: () => 35,
      getBearing: () => -12
    };
    expect(mapViewFromMap(map as any)).toEqual({ lat: 45.42, lng: -75.69, z: 7.5, pitch: 35, bearing: -12 });
  });
});
