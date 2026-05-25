import type maplibregl from 'maplibre-gl';
import { recordSourceUpdate } from '../perfDiagnostics';

export type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<Record<string, unknown>>;
};

interface SourceUpdateQueue {
  frame: number;
  pending: Map<string, FeatureCollection>;
}

const sourceUpdateQueues = new WeakMap<maplibregl.Map, SourceUpdateQueue>();

export function setSourceData(map: maplibregl.Map, sourceID: string, data: FeatureCollection) {
  let queue = sourceUpdateQueues.get(map);
  if (!queue) {
    queue = { frame: 0, pending: new Map() };
    sourceUpdateQueues.set(map, queue);
  }
  queue.pending.set(sourceID, data);
  if (queue.frame !== 0) return;
  queue.frame = window.requestAnimationFrame(() => {
    queue.frame = 0;
    const pending = [...queue.pending.entries()];
    queue.pending.clear();
    for (const [queuedSourceID, queuedData] of pending) {
      applySourceData(map, queuedSourceID, queuedData);
    }
  });
}

function applySourceData(map: maplibregl.Map, sourceID: string, data: FeatureCollection) {
  const source = map.getSource(sourceID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(data as any);
  recordSourceUpdate(sourceID);
}
