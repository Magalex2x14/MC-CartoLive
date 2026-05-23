import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HotRoutes, { recentPacketCountText, recentPacketCountTitle } from './HotRoutes';
import type { RouteActivitySummary } from '../state';
import type { PublicRoute } from '../types';

const route: PublicRoute = {
  id: 'route-a',
  from: { nodeId: 'node-a', label: 'Alpha', lat: 43.65, lng: -79.38 },
  to: { nodeId: 'node-b', label: 'Bravo', lat: 45.42, lng: -75.69 },
  distanceKm: 360,
  packetCount: 42,
  lastHeard: 1_700_000_000_000,
  frequencyBucket: 3,
  payloadTypeNames: ['ADVERT', 'TEXT_MESSAGE_APP']
};

const summary: RouteActivitySummary = {
  routeId: 'route-a',
  total: 7,
  latestHeard: 1_700_000_000_000,
  bins: Array.from({ length: 12 }, (_, index) => (index === 11 ? 7 : 0))
};

describe('HotRoutes', () => {
  it('renders compact recent packet counts without the old flow graph wording', () => {
    const html = renderToStaticMarkup(
      <HotRoutes routes={[route]} selectedRouteID={null} routeActivityByID={new Map([[route.id, summary]])} onSelect={() => undefined} />
    );

    expect(html).toContain('route-recent-count active');
    expect(html).toContain('7');
    expect(html).toContain('15m');
    expect(html).not.toContain('route-spark');
    expect(html).not.toContain('flow-cue');
    expect(html).not.toContain('Flow visible');
  });

  it('formats recent count labels and titles', () => {
    expect(recentPacketCountText(1200)).toBe('1,200');
    expect(recentPacketCountTitle(1, 42)).toBe('1 packet in the last 15 minutes; 42 lifetime');
    expect(recentPacketCountTitle(7, 42)).toBe('7 packets in the last 15 minutes; 42 lifetime');
  });
});
