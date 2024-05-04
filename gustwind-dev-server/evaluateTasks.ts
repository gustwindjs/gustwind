import { dir } from "../utilities/fs.ts";
import type { Tasks } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function evaluateTasks(tasks: Tasks) {
  const ret: Record<
    string,
    { type: "file"; data: string | Uint8Array } | {
      type: "path";
      path: string;
    }
  > = {};

  DEBUG && console.log("evaluate tasks", tasks);

  await Promise.all(tasks.map(async ({ type, payload }) => {
    switch (type) {
      case "writeTextFile":
      case "writeFile":
        ret[payload.file.startsWith("/") ? payload.file : `/${payload.file}`] =
          {
            type: "file",
            data: payload.data,
          };
        break;
      case "copyFiles": {
        const files = await dir({
          path: payload.inputDirectory,
          recursive: true,
        });
        // doesn't need to show up in the url
        // This logic has been only tested with ./foo style path.
        // The rest might be incorrect.
        let outputPrefix = payload.outputPath[0] === "."
          ? payload.outputPath.slice(1)
          : payload.outputPath;

        if (outputPrefix.length > 1) {
          outputPrefix += "/";
        }

        files.forEach((file) => {
          ret[`${outputPrefix}${file.name}`] = {
            type: "path",
            path: file.path,
          };
        });
        break;
      }
    }
  }));

  return ret;
}

export { evaluateTasks };
