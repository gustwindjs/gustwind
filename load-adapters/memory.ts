import type { LoadApi, PluginParameters, Tasks } from "../types.ts";

function initLoadApi(_tasks: Tasks): LoadApi {
  return {
    dir(_payload) {
      throw new Error(
        "memory load adapter - directory access is unavailable in in-memory rendering mode",
      );
    },
    async json<T>(_payload: Parameters<PluginParameters["load"]["json"]>[0]) {
      throw new Error(
        "memory load adapter - JSON loading is unavailable in in-memory rendering mode",
      );
    },
    async module<T>(_payload: Parameters<PluginParameters["load"]["module"]>[0]) {
      throw new Error(
        "memory load adapter - module loading is unavailable in in-memory rendering mode",
      );
    },
    textFile(_path: string) {
      throw new Error(
        "memory load adapter - text file loading is unavailable in in-memory rendering mode",
      );
    },
    textFileSync(_path: string) {
      throw new Error(
        "memory load adapter - text file loading is unavailable in in-memory rendering mode",
      );
    },
  };
}

export { initLoadApi };
