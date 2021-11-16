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

      onWorkFinished();
    }
  };
  const waitingTasks: E[] = [];
  const workers: WorkerWrapper[] = Array.from(
    { length: amount },
    () => createWorker(onReady),
  );

  return {
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
}

function createWorker(onReady: (WorkerWrapper: WorkerWrapper) => void) {
  const ret: WorkerWrapper = {
    status: "created",
    worker: new Worker(
      new URL("./buildWorker.ts", import.meta.url).href,
      {
        type: "module",
        // @ts-ignore This should be allowed based on the docs
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
