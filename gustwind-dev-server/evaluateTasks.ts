import { path } from "../server-deps.ts";
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
        ret[`/${payload.file}`] = {
          type: "file",
          data: payload.data,
        };
        break;
      case "copyFiles": {
        const outputBasename = path.basename(payload.outputPath);
        const files = await dir({
          path: payload.inputDirectory,
          recursive: true,
        });
        // ./ output is an exception as then output directory
        // doesn't need to show up in the url
        const outputPrefix = outputBasename === "."
          ? "/"
          : `/${outputBasename}/`;

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
