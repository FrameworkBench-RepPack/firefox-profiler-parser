import { Worker } from "node:worker_threads";
import {
  MessageType,
  WorkerMessage,
  WorkerOutputData,
  type WorkerInputData,
} from "./worker-types";

export function onWorkerMessage<T extends MessageType>(
  worker: Worker,
  type: T,
  handler: (message: WorkerMessage<T>) => void
) {
  worker.on("message", (message) => {
    if (message.type === type) handler(message as WorkerMessage<T>);
  });
}

interface StartWorkerInput {
  initialTask: WorkerInputData;
  taskQueue: WorkerInputData[];
  processedData: WorkerOutputData[];
  workerPath: string;
}

export function startWorker({
  initialTask,
  taskQueue,
  processedData,
  workerPath,
}: StartWorkerInput): Promise<void> {
  return new Promise<void>((res, rej) => {
    const worker = new Worker(workerPath);

    worker.postMessage({ type: MessageType.Start, payload: initialTask });

    onWorkerMessage(worker, MessageType.Error, (error) => {
      console.error("Worker threw and error: ", error);
      rej(error);
    });

    onWorkerMessage(worker, MessageType.Finished, (message) => {
      processedData.push(message.payload);

      console.log(
        `Worker finished task for: ${message.payload.benchmark} - ${message.payload.framework}`
      );

      const nextTask = taskQueue.pop();
      if (!nextTask) {
        worker.postMessage({ type: MessageType.Terminate });
        res();
        return;
      }

      worker.postMessage({ type: MessageType.Start, payload: nextTask });
    });
  });
}
