import { describe, expect, it } from 'vitest';
import { OPENFREEMAP_3D_LAYER_ID, createOpenFreeMap3DController, nodeModelKind } from './openFreeMap3D';

describe('OpenFreeMap 3D layer helpers', () => {
  it('maps public node roles to procedural model kinds', () => {
    expect(nodeModelKind({ role: 'repeater' })).toBe('repeater');
    expect(nodeModelKind({ role: 'companion' })).toBe('companion');
    expect(nodeModelKind({ role: 'room_server' })).toBe('room');
    expect(nodeModelKind({ role: 'sensor' })).toBe('other');
    expect(nodeModelKind({ role: 'repeater', isObserver: true })).toBe('observer');
  });

  it('creates a MapLibre custom 3D layer controller', () => {
    const controller = createOpenFreeMap3DController();

    expect(controller.layer.id).toBe(OPENFREEMAP_3D_LAYER_ID);
    expect(controller.layer.type).toBe('custom');
    expect((controller.layer as { renderingMode?: string }).renderingMode).toBe('3d');
    controller.destroy();
  });
});
