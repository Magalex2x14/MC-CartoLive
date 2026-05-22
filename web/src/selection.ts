export interface SelectionState {
  selectedNodeID: string | null;
  selectedRouteID: string | null;
  highlightedPathTargetID: string | null;
}

export const emptySelection: SelectionState = {
  selectedNodeID: null,
  selectedRouteID: null,
  highlightedPathTargetID: null
};

export function selectNodeSelection(nodeID: string): SelectionState {
  return {
    selectedNodeID: nodeID,
    selectedRouteID: null,
    highlightedPathTargetID: null
  };
}

export function selectRouteSelection(routeID: string): SelectionState {
  return {
    selectedNodeID: null,
    selectedRouteID: routeID,
    highlightedPathTargetID: null
  };
}

export function selectPathTargetSelection(current: SelectionState, targetNodeID: string): SelectionState {
  return {
    selectedNodeID: current.selectedNodeID,
    selectedRouteID: null,
    highlightedPathTargetID: targetNodeID
  };
}

export function clearSelection(): SelectionState {
  return emptySelection;
}
