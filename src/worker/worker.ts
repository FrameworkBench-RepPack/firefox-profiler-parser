import { parentPort } from "worker_threads";
import {
  MessageType,
  type WorkerMessage,
  type MessageStructures,
  type SerializedProcessedFile,
} from "./worker-types.ts";
import { type InputFile, loadFile } from "../utilities/file-helpers.ts";
import { profilerSchema } from "../schemas/profilerSchema.ts";
import {
  type BenchmarkPowerConsumption,
  processPowerConsumption,
} from "../utilities/power-utilities.ts";
import { PowerAmount, PowerAmountUnit } from "../power-amount.ts";
import {
  type BenchmarkBandwidth,
  processBandwidth,
} from "../utilities/bandwidth.ts";

function onWorkerMessage<T extends MessageType>(
  type: T,
  handler: (message: WorkerMessage<T>) => void,
) {
  parentPort?.on("message", (message) => {
    if (message.type === type) handler(message as WorkerMessage<T>);
  });
}

function getAveragePower(inputs: PowerAmount[]): PowerAmount | undefined {
  if (inputs.length === 0) return undefined;

  const consumption = inputs.reduce<PowerAmount>(
    (acc, curr) => {
      acc.addAmount(curr);
      return acc;
    },
    new PowerAmount(0, PowerAmountUnit.PicoWattHour),
  );

  consumption.setAmount(consumption.getAmount() / inputs.length);
  return consumption;
}

function getPowerStandardDeviation(
  inputs: PowerAmount[],
): PowerAmount | undefined {
  if (inputs.length === 0) return undefined;

  const mean =
    inputs.reduce((acc, curr) => {
      acc += curr.getAmount(PowerAmountUnit.PicoWattHour);
      return acc;
    }, 0) / inputs.length;

  const sumPart = inputs.reduce((acc, curr) => {
    acc += (curr.getAmount(PowerAmountUnit.PicoWattHour) - mean) ** 2;
    return acc;
  }, 0);

  return new PowerAmount(
    Math.sqrt(sumPart / inputs.length),
    PowerAmountUnit.PicoWattHour,
  );
}

function getAverageBandwidth(inputs: number[]): number | undefined {
  if (inputs.length === 0) return undefined;

  let totalBytes = 0;
  for (const input of inputs) {
    totalBytes += input;
  }

  return totalBytes / inputs.length;
}

function getBandwidthStandardDeviation(inputs: number[]): number | undefined {
  if (inputs.length === 0) return undefined;

  const mean = getAverageBandwidth(inputs)!;

  const sumPart = inputs.reduce((acc, curr) => {
    acc += (curr - mean) ** 2;
    return acc;
  }, 0);

  return Math.sqrt(sumPart / inputs.length);
}

function postMessage<T extends MessageType>(message: MessageStructures[T][0]) {
  parentPort?.postMessage(message);
}

type ProcessedFile = {
  name: string;
  path: string;
  powerConsumption?: BenchmarkPowerConsumption;
  bandwidth?: BenchmarkBandwidth;
};

async function processFile(file: InputFile): Promise<ProcessedFile> {
  const loadedFile = await loadFile(file);
  const parsedFile = await profilerSchema.safeParseAsync(
    JSON.parse(loadedFile.content),
  );

  if (!parsedFile.success)
    throw new Error(
      `Failed to parse file: "${file.path}" with error: ${parsedFile.error}`,
    );

  // Identify the process of the utilized tab
  const localhostProcess = parsedFile.data.processes.find((process) => {
    for (const page of process.pages) {
      if (page.url.includes("http://localhost:")) return true;
    }

    return false;
  });

  if (!localhostProcess) {
    throw new Error(
      "Profiling does not contain a process for a page hosted locally",
    );
  }

  const powerCounter = localhostProcess.counters?.find(
    (counter) => counter.category === "power",
  );

  const powerConsumption = powerCounter
    ? processPowerConsumption(powerCounter)
    : undefined;

  const bandwidthMarkers = localhostProcess.threads?.find(
    (thread) => thread.name === "GeckoMain",
  )?.markers.data;

  const bandwidth = bandwidthMarkers
    ? processBandwidth(bandwidthMarkers)
    : undefined;

  return {
    powerConsumption,
    bandwidth,
    ...file,
  };
}

function serializeProcessedFile(
  processedFile: ProcessedFile,
): SerializedProcessedFile {
  return {
    ...processedFile,
    powerConsumption: processedFile.powerConsumption
      ? {
          total: processedFile.powerConsumption.total.toJSON(),
          measurements: processedFile.powerConsumption.measurements.toJSON(),
        }
      : undefined,
  };
}

(async () => {
  if (!parentPort) throw new Error("Message channel 'parentPort' not defined");

  onWorkerMessage(MessageType.Start, async ({ payload }) => {
    const fileProcessingPromises = payload.files.map(async (file) =>
      processFile(file),
    );

    const processedFiles = await Promise.all(fileProcessingPromises);

    const processedTotalPower = processedFiles
      .map((file) => file.powerConsumption?.total)
      .filter((total) => total !== undefined);

    const processedTotalBandwidth = processedFiles
      .map((file) => file.bandwidth?.total)
      .filter((total) => total !== undefined);

    postMessage({
      type: MessageType.Finished,
      payload: {
        benchmark: payload.benchmark,
        framework: payload.framework,
        powerAverage: getAveragePower(processedTotalPower)?.toJSON(),
        powerStandardDeviation:
          getPowerStandardDeviation(processedTotalPower)?.toJSON(),
        bandwidthAverage: getAverageBandwidth(processedTotalBandwidth),
        bandwidthStandardDeviation: getBandwidthStandardDeviation(
          processedTotalBandwidth,
        ),
        files: processedFiles.map((f) => serializeProcessedFile(f)),
      },
    });
  });

  await new Promise<void>((res, rej) => {
    onWorkerMessage(MessageType.Terminate, () => {
      res();
    });
  });
})()
  .catch((err) => {
    parentPort?.postMessage({
      type: MessageType.Error,
      payload: { error: err.message },
    });
  })
  .finally(() => process.exit(0));
