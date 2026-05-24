import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensurePerfDiagnostics,
  recordPacketFrame,
  recordPacketSkippedFrame,
  recordSourceUpdate,
  recordVcrReplayQueueSize
} from './perfDiagnostics';

describe('perf diagnostics', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true);
    delete window.__mcCartoLivePerf;
  });

  it('exposes local counters without sending telemetry', () => {
    const counters = ensurePerfDiagnostics();
    expect(counters).toBeTruthy();

    recordSourceUpdate('routes');
    recordSourceUpdate('nodes');
    recordSourceUpdate('cluster-activity');
    recordPacketFrame(3, 2, 12.34);
    recordPacketSkippedFrame();
    recordVcrReplayQueueSize(42.8);

    expect(window.__mcCartoLivePerf).toMatchObject({
      routeSourceUpdates: 1,
      nodeSourceUpdates: 1,
      otherSourceUpdates: 1,
      packetActiveComets: 3,
      packetActiveObserverBursts: 2,
      packetFrameMs: 12.3,
      packetSkippedFrames: 1,
      vcrReplayQueueSize: 42
    });
  });
});
