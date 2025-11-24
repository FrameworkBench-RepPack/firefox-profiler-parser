import { type InputFile } from "../utilities/file-helpers.ts";
import { type SerializedPowerAmount } from "../power-amount.ts";
import { type SerializedBenchmarkPowerConsumption } from "../utilities/power-utilities.ts";

export type SerializedProcessedFile = InputFile & {
  powerConsumption?: SerializedBenchmarkPowerConsumption;
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
