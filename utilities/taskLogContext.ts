import { AsyncLocalStorage } from "node:async_hooks";
import type { BuildWorkerEvent, Tasks } from "../types.ts";

const taskLogStorage = new AsyncLocalStorage<Tasks>();

async function runWithTaskLog<T>(fn: () => Promise<T>) {
  const tasks: Tasks = [];
  const result = await taskLogStorage.run(tasks, fn);

  return { result, tasks };
}

function recordTask(globalTasks: Tasks, task: BuildWorkerEvent) {
  const activeTasks = taskLogStorage.getStore();

  if (activeTasks) {
    activeTasks.push(task);
    return;
  }

  globalTasks.push(task);
}

export { recordTask, runWithTaskLog };
