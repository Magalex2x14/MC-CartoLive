import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSourceData } from './sourceDataQueue';

describe('sourceDataQueue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('coalesces same-frame source updates and applies only the latest data per source', () => {
    const setData = vi.fn();
    const map = {
      getSource: () => ({ setData })
    };
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });

    setSourceData(map as any, 'routes', { type: 'FeatureCollection', features: [{ id: 'old' }] });
    setSourceData(map as any, 'routes', { type: 'FeatureCollection', features: [{ id: 'new' }] });

    expect(callbacks).toHaveLength(1);
    callbacks[0](0);
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData.mock.calls[0][0].features[0].id).toBe('new');
  });
});
