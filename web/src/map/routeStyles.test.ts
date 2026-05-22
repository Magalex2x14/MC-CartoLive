import { describe, expect, it } from 'vitest';
import {
  ROUTE_ACTIVE_OPACITY,
  ROUTE_ACTIVE_WIDTH,
  ROUTE_BASE_OPACITY,
  ROUTE_BASE_WIDTH,
  ROUTE_CONNECTED_OPACITY,
  ROUTE_CONNECTED_WIDTH,
  ROUTE_DIMMED_OPACITY,
  ROUTE_PATH_OPACITY,
  ROUTE_PATH_WIDTH,
  routeLineOpacity,
  routeLineWidth
} from './routeStyles';

describe('route line styles', () => {
  it('uses a subtle base style for unfocused routes', () => {
    expect(routeLineOpacity({})).toBe(ROUTE_BASE_OPACITY);
    expect(routeLineWidth({})).toBe(ROUTE_BASE_WIDTH);
  });

  it('lifts explicitly selected routes without exceeding packet priority', () => {
    expect(routeLineOpacity({ selected: true })).toBe(ROUTE_ACTIVE_OPACITY);
    expect(routeLineWidth({ selected: true })).toBe(ROUTE_ACTIVE_WIDTH);
  });

  it('dims unrelated routes only when they are not focused', () => {
    expect(routeLineOpacity({ dimmed: true })).toBe(ROUTE_DIMMED_OPACITY);
    expect(routeLineWidth({ dimmed: true })).toBe(ROUTE_BASE_WIDTH);
    expect(routeLineOpacity({ selected: true, dimmed: true })).toBe(ROUTE_ACTIVE_OPACITY);
    expect(routeLineWidth({ selected: true, dimmed: true })).toBe(ROUTE_ACTIVE_WIDTH);
  });

  it('lifts connected neighbour routes below explicitly selected routes', () => {
    expect(routeLineOpacity({ connected: true })).toBe(ROUTE_CONNECTED_OPACITY);
    expect(routeLineWidth({ connected: true })).toBe(ROUTE_CONNECTED_WIDTH);
    expect(routeLineOpacity({ connected: true, selected: true })).toBe(ROUTE_ACTIVE_OPACITY);
    expect(routeLineWidth({ connected: true, selected: true })).toBe(ROUTE_ACTIVE_WIDTH);
  });

  it('shows phonebook paths above direct connected routes but below explicit route selection', () => {
    expect(routeLineOpacity({ path: true })).toBe(ROUTE_PATH_OPACITY);
    expect(routeLineWidth({ path: true })).toBe(ROUTE_PATH_WIDTH);
    expect(routeLineOpacity({ path: true, connected: true })).toBe(ROUTE_PATH_OPACITY);
    expect(routeLineWidth({ path: true, selected: true })).toBe(ROUTE_ACTIVE_WIDTH);
  });
});
