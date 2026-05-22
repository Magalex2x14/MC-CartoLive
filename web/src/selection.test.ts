import { describe, expect, it } from 'vitest';
import {
  clearSelection,
  selectNodeSelection,
  selectPathTargetSelection,
  selectRouteSelection
} from './selection';

describe('selection state', () => {
  it('selecting a route clears node and phonebook path focus', () => {
    expect(selectRouteSelection('route-1')).toEqual({
      selectedNodeID: null,
      selectedRouteID: 'route-1',
      highlightedPathTargetID: null
    });
  });

  it('clearing selection removes node, route, and path target', () => {
    expect(clearSelection()).toEqual({
      selectedNodeID: null,
      selectedRouteID: null,
      highlightedPathTargetID: null
    });
  });

  it('phonebook path selection preserves source node and clears route selection', () => {
    expect(selectPathTargetSelection(selectNodeSelection('node-a'), 'node-c')).toEqual({
      selectedNodeID: 'node-a',
      selectedRouteID: null,
      highlightedPathTargetID: 'node-c'
    });
  });
});
