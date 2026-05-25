import { describe, expect, it } from 'vitest';
import { arcPointAt, routeArcHeightMeters, routeArcSampleCount, sampleRouteArc } from './routeArcs';

describe('route arc helpers', () => {
  it('samples deterministic elevated arcs with endpoints preserved', () => {
    const from = { lat: 43.65, lng: -79.38 };
    const to = { lat: 45.42, lng: -75.69 };
    const samples = sampleRouteArc(from, to, { distanceKm: 350 });

    expect(samples.length).toBeGreaterThan(8);
    expect(samples[0]).toMatchObject({ lat: from.lat, lng: from.lng, altitudeMeters: 0, progress: 0 });
    expect(samples[samples.length - 1]).toMatchObject({ lat: to.lat, lng: to.lng, altitudeMeters: expect.closeTo(0, 6), progress: 1 });
    expect(samples[Math.floor(samples.length / 2)].altitudeMeters).toBeGreaterThan(1000);
    expect(samples).toEqual(sampleRouteArc(from, to, { distanceKm: 350 }));
  });

  it('clamps sample count and altitude for very long routes', () => {
    expect(routeArcSampleCount(10_000)).toBeLessThanOrEqual(34);
    expect(routeArcHeightMeters(10_000)).toBe(18_000);
    expect(routeArcHeightMeters(0)).toBe(180);
  });

  it('interpolates a point along an arc', () => {
    const samples = sampleRouteArc({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, { distanceKm: 100, minSamples: 9, maxSamples: 9 });
    const point = arcPointAt(samples, 0.5);

    expect(point?.lat).toBeCloseTo(5, 6);
    expect(point?.lng).toBeCloseTo(5, 6);
    expect(point?.altitudeMeters).toBe(routeArcHeightMeters(100));
  });
});
