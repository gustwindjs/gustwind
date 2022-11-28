import { BuildWorkerMessageTypes } from "../types.ts";

type WorkerStatus = "created" | "processing" | "waiting";
type WorkerWrapper = { status: WorkerStatus; worker: Worker };

const DEBUG = Deno.env.get("DEBUG") === "1";

function createWorkerPool<E>(amount: number) {
  let onWorkFinished: () => void;
  const onReady = (workerWrapper: WorkerWrapper) => {
    workerWrapper.status = "waiting";

    if (waitingTasks.length) {
      const task = waitingTasks.pop();

      DEBUG &&
        console.log(
          "worker pool - next task to process",
          task,
          workers,
          waitingTasks,
        );

      workerWrapper.status = "processing";
      workerWrapper.worker.postMessage(task);
    } else if (workers.every(({ status }) => status !== "processing")) {
      DEBUG && console.log("worker pool - all work done", workers);

      onWorkFinished && onWorkFinished();
    }
  };
  const waitingTasks: E[] = [];
  const api = {
    addTaskToEach: (task: E) => {
      workers.forEach((workerWrapper) => {
        workerWrapper.status = "processing";
        workerWrapper.worker.postMessage(task);
      });
    },
    addTaskToQueue: (task: E) => {
      const freeWorker = workers.find(({ status }) => status !== "processing");

      if (freeWorker) {
        freeWorker.status = "processing";
        freeWorker.worker.postMessage(task);
      } else {
        waitingTasks.push(task);
      }
    },
    terminate: () => {
      workers.forEach(({ worker }) => worker.terminate());
    },
    onWorkFinished: (cb: () => void) => {
      onWorkFinished = cb;
    },
  };
  const workers: WorkerWrapper[] = Array.from(
    { length: amount },
    () => createWorker<E>(onReady, api.addTaskToQueue),
  );

  return api;
}

function createWorker<E>(
  onReady: (WorkerWrapper: WorkerWrapper) => void,
  addTaskToQueue: (task: E) => void,
) {
  const ret: WorkerWrapper = {
    status: "created",
    worker: new Worker(
      new URL("./buildWorker.ts", import.meta.url).href,
      { type: "module" },
    ),
  };
  ret.worker.onmessage = ({ data: { type, payload } }) => {
    if (type === BuildWorkerMessageTypes["addTasks"]) {
      payload.forEach(addTaskToQueue);
    } else if (type === BuildWorkerMessageTypes["finished"]) {
      onReady(ret);
    } else {
      throw new Error(`Unknown message type ${type}`);
    }
  };

  return ret;
}

export { createWorkerPool };
