type WorkerStatus = "created" | "processing" | "waiting";
type WorkerWrapper = { status: WorkerStatus; worker: Worker };

function createWorkerPool<E>(amount: number, onWorkDone: () => void) {
  const onReady = (workerWrapper: WorkerWrapper) => {
    workerWrapper.status = "waiting";

    if (waitingTasks.length) {
      const task = waitingTasks.pop();

      workerWrapper.status = "processing";
      workerWrapper.worker.postMessage(task);
    } else if (workers.every(({ status }) => status !== "processing")) {
      onWorkDone();
    }
  };
  const waitingTasks: E[] = [];
  const workers: WorkerWrapper[] = Array.from(
    { length: amount },
    () => createWorker(onReady),
  );

  return {
    addTaskToEach: (task: E) => {
      workers.forEach(({ worker }) => worker.postMessage(task));
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
  };
}

function createWorker(onReady: (WorkerWrapper: WorkerWrapper) => void) {
  const ret: WorkerWrapper = {
    status: "created",
    worker: new Worker(
      new URL("./buildWorker.ts", import.meta.url).href,
      {
        type: "module",
        deno: {
          namespace: true,
          permissions: "inherit",
        },
      },
    ),
  };
  ret.worker.onmessage = () => onReady(ret);

  return ret;
}

export { createWorkerPool };
