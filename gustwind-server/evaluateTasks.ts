import { path } from "../server-deps.ts";
import { compileTypeScript } from "../utilities/compileTypeScript.ts";
import { dirSync } from "../utilities/fs.ts";
import type { Tasks } from "../types.ts";

async function evaluateTasks(tasks: Tasks) {
  const ret: Record<
    string,
    { type: "file"; data: string } | {
      type: "path";
      path: string;
    }
  > = {};

  await Promise.all(tasks.map(async ({ type, payload }) => {
    switch (type) {
      case "writeFile":
        ret[`/${payload.file}`] = {
          type: "file",
          data: payload.data,
        };
        break;
      case "writeFiles": {
        const outputBasename = path.basename(payload.outputPath);

        dirSync(payload.inputDirectory).forEach((file) => {
          ret[`/${outputBasename}/${file.name}`] = {
            type: "path",
            path: file.path,
          };
        });
        break;
      }
      case "writeScript": {
        const data = await compileTypeScript(
          payload.scriptPath,
          "development",
        );

        ret[`/${payload.scriptName}`] = {
          type: "file",
          data,
        };

        break;
      }
    }
  }));

  return ret;
}

export { evaluateTasks };
