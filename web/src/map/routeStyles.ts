export const ROUTE_BASE_OPACITY = 0.28;
export const ROUTE_DIMMED_OPACITY = 0.14;
export const ROUTE_ACTIVE_OPACITY = 0.68;
export const ROUTE_PATH_OPACITY = 0.74;
export const ROUTE_CONNECTED_OPACITY = 0.62;
export const ROUTE_BASE_WIDTH = 1.65;
export const ROUTE_ACTIVE_WIDTH = 3;
export const ROUTE_PATH_WIDTH = 3.4;
export const ROUTE_CONNECTED_WIDTH = 2.8;

export interface RouteRenderState {
  selected?: boolean;
  path?: boolean;
  connected?: boolean;
  dimmed?: boolean;
}

export function routeLineOpacity(state: RouteRenderState): number {
  if (state.selected) return ROUTE_ACTIVE_OPACITY;
  if (state.path) return ROUTE_PATH_OPACITY;
  if (state.connected) return ROUTE_CONNECTED_OPACITY;
  if (state.dimmed) return ROUTE_DIMMED_OPACITY;
  return ROUTE_BASE_OPACITY;
}

export function routeLineWidth(state: RouteRenderState): number {
  if (state.selected) return ROUTE_ACTIVE_WIDTH;
  if (state.path) return ROUTE_PATH_WIDTH;
  if (state.connected) return ROUTE_CONNECTED_WIDTH;
  return ROUTE_BASE_WIDTH;
}
