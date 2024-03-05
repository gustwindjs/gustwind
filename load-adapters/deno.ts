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

      const pathPrefix = isRelativeImport(payload.path) ? "file://" : "";

      // https://examples.deno.land/importing-json
      return import(
        `${pathPrefix}${payload.path}?cache=${new Date().getTime()}`,
        {
          with: { type: "json" },
        }
      ).then((m) => m.default) as Promise<T>;
    },
    module<T>(payload: Parameters<PluginParameters["load"]["module"]>[0]) {
      tasks.push({ type: "loadModule", payload });

      const pathPrefix = isRelativeImport(payload.path) ? "file://" : "";

      return import(
        `${pathPrefix}${payload.path}?cache=${new Date().getTime()}`
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

function isRelativeImport(s: string) {
  return ["/", "./", "../"].some((prefix) => s.startsWith(prefix));
}

export { initLoadApi };
