import type { CSSProperties } from 'react';
import { hiddenPayloadCount, payloadVisualsFor } from '../payloadVisuals';
import type { RouteActivitySummary } from '../state';
import type { PublicRoute } from '../types';

interface Props {
  routes: PublicRoute[];
  selectedRouteID: string | null;
  routeActivityByID: Map<string, RouteActivitySummary>;
  onSelect: (routeID: string) => void;
}

export default function HotRoutes({ routes, selectedRouteID, routeActivityByID, onSelect }: Props) {
  return (
    <section className="hot-routes">
      <div className="panel-title compact">
        <span>Busy Pathways</span>
        <em>last 15m</em>
      </div>
      <div className="hot-route-list">
        {routes.slice(0, 10).map((route) => {
          const activity = routeActivityByID.get(route.id);
          const recentCount = activity?.total ?? 0;
          const payloads = payloadVisualsFor(route.payloadTypeNames, 3);
          const hiddenCount = hiddenPayloadCount(route.payloadTypeNames, payloads.length);
          return (
            <button className={`hot-route ${route.id === selectedRouteID ? 'selected' : ''} ${recentCount > 0 ? 'recent' : ''}`} key={route.id} type="button" onClick={() => onSelect(route.id)}>
              <span className={`route-swatch bucket-${route.frequencyBucket}`} />
              <span className="route-labels">
                <strong>{route.from.label}</strong>
                <span>{route.to.label}</span>
                <span className="hot-route-payloads" aria-label="Payload mix">
                  {payloads.map((payload) => (
                    <i className="payload-chip mini" style={{ '--payload-color': payload.color } as CSSProperties} title={payload.label} key={`${route.id}-${payload.className}`}>
                      {payload.shortLabel}
                    </i>
                  ))}
                  {hiddenCount > 0 && <i className="payload-chip mini muted-chip">+{hiddenCount}</i>}
                </span>
              </span>
              <span className={`route-recent-count ${recentCount > 0 ? 'active' : ''}`} title={recentPacketCountTitle(recentCount, route.packetCount)}>
                <strong>{recentPacketCountText(recentCount)}</strong>
                <small>15m</small>
              </span>
            </button>
          );
        })}
        {routes.length === 0 && <div className="empty compact-empty">No busy pathways</div>}
      </div>
    </section>
  );
}

export function recentPacketCountText(count: number): string {
  return Math.max(0, Math.floor(count)).toLocaleString();
}

export function recentPacketCountTitle(recentCount: number, lifetimeCount: number): string {
  const recent = Math.max(0, Math.floor(recentCount));
  const lifetime = Math.max(0, Math.floor(lifetimeCount));
  return `${recent.toLocaleString()} ${recent === 1 ? 'packet' : 'packets'} in the last 15 minutes; ${lifetime.toLocaleString()} lifetime`;
}
