import type { Thread } from "../schemas/threadSchemas.ts";
import { isNetworkPayload } from "../schemas/markerSchemas.ts";

export type BandwidthMeasurement = [string, number];

export type BenchmarkBandwidth = {
  total: number;
  measurements: BandwidthMeasurement[];
};

export function processBandwidth(
  markers: Thread["markers"]["data"],
): BenchmarkBandwidth {
  let total = 0;
  const measurements: BandwidthMeasurement[] = [];

  for (const marker of markers) {
    const payload = marker[5];
    if (!isNetworkPayload(payload) || payload.count === undefined) continue;
    measurements.push([payload.URI, payload.count]);
    total += payload.count;
  }

  return {
    total,
    measurements,
  };
}
