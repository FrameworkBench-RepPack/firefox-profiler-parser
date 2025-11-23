import { program } from "commander";
import path from "node:path";
import { mkdirSync, write } from "node:fs";
import {
  getBenchmarkFiles,
  getResultsPath,
  groupFiles,
} from "./utilities/file-helpers";
import { WorkerInputData, WorkerOutputData } from "./worker/worker-types";
import {
  PowerAmount,
  PowerAmountSeries,
  PowerAmountUnit,
} from "./power-amount";
import { startWorker } from "./worker/start-worker";
import { writeCSV } from "./utilities/csv-utilities";

const PROCESSING_WORKER_PATH = path.resolve(
  import.meta.dirname,
  "./worker/worker.ts",
);

(async () => {
  program
    .name("Firefox Profiler Parser")
    .description(
      "A CLI tool for processing power measurements from the Firefox Profiler",
    )
    .version("1.0.0")
    .argument(
      "<path>",
      "Path to a profiler .json file or a folder containing multiple profiler .json files",
    )
    .option("-t, --threads <entries>", "specify number of workers to use", "1")
    .option("--exportRaw", "export power measurements in csv file", false);

  // Parse program and extract options
  program.parse();
  const options = program.opts();

  const inputPath = program.args[0];
  if (!inputPath || typeof inputPath !== "string")
    throw new Error("Passed path is not a string");

  const threads = Number.parseInt(options.threads);

  // Get and organize relevant files
  const files = await getBenchmarkFiles(inputPath);
  const groupedFiles = groupFiles(files);

  // Prepare variables
  const tasks: WorkerInputData[] = [];
  const processedData: WorkerOutputData[] = [];

  // Create worker tasks
  for (const [benchmark, benchmarkObject] of Object.entries(groupedFiles)) {
    console.log(`Benchmark: ${benchmark}`);
    for (const [framework, files] of Object.entries(benchmarkObject)) {
      console.log(
        `Creating Worker Task - Framework: ${framework}, Iterations: ${files.length}`,
      );

      const workerData: WorkerInputData = { benchmark, framework, files };
      tasks.push(workerData);
    }
  }

  // Schedule threads
  console.log(`Starting ${threads} workers`);

  const workers: Promise<void>[] = [];
  for (let i = 0; i < threads; i++) {
    const task = tasks.pop();
    if (!task) break;
    workers.push(
      startWorker({
        initialTask: task,
        taskQueue: tasks,
        processedData,
        workerPath: PROCESSING_WORKER_PATH,
      }),
    );
  }
  await Promise.all(workers);

  const resultsFolder = await getResultsPath(inputPath);

  // TODO: Should take power consumption unit into consideration
  for (const result of processedData) {
    const average: PowerAmount = PowerAmount.fromJSON(result.average);
    average.convert(PowerAmountUnit.MicroWattHour);

    const standardDeviation: PowerAmount = PowerAmount.fromJSON(
      result.standardDeviation,
    );
    standardDeviation.convert(PowerAmountUnit.MicroWattHour);

    console.log(
      `${result.benchmark} - ${result.framework} - Average: ${average.getString(
        2,
      )} Standard deviation: ${standardDeviation.getString(2)}`,
    );

    // Extract total power measurements
    writeCSV({
      path:
        resultsFolder +
        `/${result.benchmark}-${result.framework}_power-total.csv`,
      header: ["Iteration", `Total Power (${PowerAmountUnit.MicroWattHour})`],
      fields: result.files.map((processedFile, index) => [
        index,
        PowerAmount.fromJSON(processedFile.powerConsumption.total).getAmount(
          PowerAmountUnit.MicroWattHour,
        ),
      ]),
    });

    if (options.exportRaw) {
      for (const file of result.files) {
        const fileName = file.name.split(".")[0];
        if (!fileName) throw new Error("Splitting file failed");

        const powerAmountSeries = PowerAmountSeries.fromJSON(
          file.powerConsumption.measurements,
        );

        writeCSV({
          path: resultsFolder + `/${fileName}_power-raw.csv`,
          header: ["Time", `Total Power (${powerAmountSeries.getUnit()})`],
          fields: powerAmountSeries
            .getMeasurements()
            .map((measurement) => [measurement.time, measurement.power]),
        });
      }
    }
  }
})();
