import type { InputFile } from "../utilities/file-helpers.ts";
import type { SerializedPowerAmount } from "../power-amount.ts";
import type {
  BenchmarkPowerConsumption,
  SerializedBenchmarkPowerConsumption,
} from "../utilities/power-utilities.ts";
import type { BenchmarkBandwidth } from "../utilities/bandwidth.ts";

export type SerializedProcessedFile = InputFile & {
  powerConsumption?: SerializedBenchmarkPowerConsumption;
  bandwidth?: BenchmarkBandwidth;
};

export type ProcessedFile = InputFile & {
  powerConsumption?: BenchmarkPowerConsumption;
  bandwidth?: BenchmarkBandwidth;
};

export type WorkerInputData = {
  benchmark: string;
  framework: string;
  files: InputFile[];
};
export type WorkerOutputData = {
  benchmark: string;
  framework: string;
  powerAverage?: SerializedPowerAmount;
  powerStandardDeviation?: SerializedPowerAmount;
  bandwidthAverage?: number;
  bandwidthStandardDeviation?: number;
  files: SerializedProcessedFile[];
};

export const MessageType = {
  Start: 0,
  Finished: 1,
  Error: 2,
  Terminate: 3,
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

type PayloadMap = {
  [MessageType.Start]: WorkerInputData;
  [MessageType.Finished]: WorkerOutputData;
  [MessageType.Error]: { error: string };
  [MessageType.Terminate]: null;
};

export type WorkerMessage<Type extends MessageType> = {
  type: Type;
  payload: PayloadMap[Type];
};

export type MessageStructures = {
  [K in MessageType]: [WorkerMessage<K>, null];
};
