import { dir } from "../utilities/fs.ts";
import type { Tasks } from "../types.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";

const DEBUG = isDebugEnabled();

async function evaluateTasks(tasks: Tasks) {
  const ret: Record<
    string,
    | { type: "file"; data: string | Uint8Array }
    | {
        type: "path";
        path: string;
      }
  > = {};

  DEBUG && console.log("evaluate tasks", tasks);

  await Promise.all(tasks.map((task) => evaluateTask(task, ret)));

  return ret;
}

async function evaluateTask(
  { type, payload }: Tasks[number],
  ret: Awaited<ReturnType<typeof evaluateTasks>>,
) {
  switch (type) {
    case "writeTextFile":
    case "writeFile":
      ret[toRoutePath(payload.file)] = {
        type: "file",
        data: payload.data,
      };
      break;
    case "copyFiles":
      await evaluateCopyFilesTask(payload, ret);
      break;
  }
}

async function evaluateCopyFilesTask(
  payload: Extract<Tasks[number], { type: "copyFiles" }>["payload"],
  ret: Awaited<ReturnType<typeof evaluateTasks>>,
) {
  const files = await dir({
    path: payload.inputDirectory,
    recursive: true,
  });
  const outputPrefix = getOutputPrefix(payload.outputPath);

  files.forEach((file) => {
    ret[toRoutePath(`${outputPrefix}${file.name}`)] = {
      type: "path",
      path: file.path,
    };
  });
}

function getOutputPrefix(outputPath: string) {
  // doesn't need to show up in the url
  // This logic has been only tested with ./foo style path.
  // The rest might be incorrect.
  const outputPrefix = outputPath[0] === "." ? outputPath.slice(1) : outputPath;

  return outputPrefix.length > 1 ? `${outputPrefix}/` : outputPrefix;
}

function toRoutePath(routePath: string) {
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
}

export { evaluateTasks };
