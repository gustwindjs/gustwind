import { dir } from "../utilities/fs.ts";
import type { LoadApi, PluginParameters, Tasks } from "../types.ts";

function initLoadApi(tasks: Tasks): LoadApi {
  return {
    dir({ path, extension, recursive, type }) {
      tasks.push({
        type: "listDirectory",
        payload: { path, type },
      });

      return dir({ path, extension, recursive });
    },
    json<T>(payload: Parameters<PluginParameters["load"]["json"]>[0]) {
      tasks.push({ type: "loadJSON", payload });

      // TODO: Is it enough to support only local paths here?
      // https://examples.deno.land/importing-json
      return import(
        `file://${payload.path}?cache=${new Date().getTime()}`,
        {
          with: { type: "json" },
        }
      ).then((m) => m.default) as Promise<T>;
    },
    module<T>(payload: Parameters<PluginParameters["load"]["module"]>[0]) {
      tasks.push({ type: "loadModule", payload });

      // TODO: Is it enough to support only local paths here?
      return import(
        `file://${payload.path}?cache=${new Date().getTime()}`
      ) as Promise<T>;
    },
    textFile(path: string) {
      tasks.push({
        type: "readTextFile",
        payload: { path, type: "" },
      });

      return Deno.readTextFile(path);
    },
    textFileSync(path: string) {
      tasks.push({
        type: "readTextFile",
        payload: { path, type: "" },
      });

      return Deno.readTextFileSync(path);
    },
  };
}

export { initLoadApi };
