import * as path from "node:path";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { createBuildBenchmark } from "../utilities/buildBenchmark.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import type { Tasks } from "../types.ts";

const DEBUG = isDebugEnabled();
const readOnlyTaskTypes = new Set([
  "init",
  "listDirectory",
  "loadJSON",
  "loadModule",
  "readTextFile",
] as const);
type ReadOnlyTaskType =
  typeof readOnlyTaskTypes extends Set<infer T> ? T : never;

async function executeTask({
  benchmark,
  outputDirectory,
  task,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  outputDirectory: string;
  task: Exclude<Tasks[number], { type: "build" }>;
}) {
  DEBUG && console.log("node build - running task", task.type);
  benchmark?.markTaskProcessed();
  const execute = taskExecutors[task.type];

  if (execute) {
    await execute(task.payload as never);
    return;
  }

  if (isReadOnlyTask(task)) {
    return;
  }

  throw new Error(`Unsupported build task ${task.type}`);
}

const taskExecutors: Record<string, (payload: never) => Promise<void>> = {
  copyFiles: (
    payload: Extract<Tasks[number], { type: "copyFiles" }>["payload"],
  ) => executeCopyTask(payload),
  writeFile: (
    payload: Extract<
      Tasks[number],
      { type: "writeFile" | "writeTextFile" }
    >["payload"],
  ) => executeWriteTask(payload),
  writeTextFile: (
    payload: Extract<
      Tasks[number],
      { type: "writeFile" | "writeTextFile" }
    >["payload"],
  ) => executeWriteTask(payload),
};

function isReadOnlyTask(
  task: Exclude<Tasks[number], { type: "build" }>,
): task is Extract<
  Tasks[number],
  {
    type: "loadJSON" | "loadModule" | "listDirectory" | "readTextFile" | "init";
  }
> {
  return readOnlyTaskTypes.has(task.type as ReadOnlyTaskType);
}

async function executeWriteTask(
  payload: Extract<
    Tasks[number],
    { type: "writeFile" | "writeTextFile" }
  >["payload"],
) {
  if (payload.outputDirectory.endsWith(".html")) {
    return;
  }

  const filePath = path.join(payload.outputDirectory, payload.file);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, payload.data);
}

async function executeCopyTask(
  payload: Extract<Tasks[number], { type: "copyFiles" }>["payload"],
) {
  await cp(
    payload.inputDirectory,
    path.join(payload.outputDirectory, payload.outputPath),
    { force: true, recursive: true },
  );
}

export { executeTask };
