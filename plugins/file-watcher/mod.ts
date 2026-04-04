import * as _path from "node:path";
import { watch } from "../../utilities/watch.ts";
import type { Plugin } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const plugin: Plugin<{ pluginsPath: string }> = {
  meta: {
    name: "file-watcher-plugin",
    description:
      "${name} implements file watcher exposing a `fileChanged` trigger for other plugins to use.",
  },
  init: async ({ mode, load, options: { pluginsPath } }) => {
    if (mode !== "development") {
      return {};
    }

    let activeWatcher: Awaited<ReturnType<typeof watch>> | undefined;
    const pathTypes = new Map<string, string>();

    // Connect plugins.json path with the file watcher
    await load.json({ path: pluginsPath, type: "plugins" });

    return {
      async onTasksRegistered({ tasks, send }) {
        const paths = tasks.flatMap(({ type, payload }) => {
          switch (type) {
            case "readTextFile":
            case "listDirectory":
            case "loadJSON":
            case "loadModule": {
              return payload.path;
            }
            case "copyFiles":
              return payload.inputDirectory;
          }
        }).filter(Boolean) as string[]; // TS doesn't infer this case!
        const newPaths = tasks.flatMap(({ type, payload }) => {
          switch (type) {
            case "readTextFile":
            case "listDirectory":
            case "loadJSON":
            case "loadModule": {
              if (!pathTypes.has(payload.path)) {
                pathTypes.set(payload.path, payload.type);

                return payload.path;
              }

              return [];
            }
            case "copyFiles":
              if (!pathTypes.has(payload.inputDirectory)) {
                pathTypes.set(payload.inputDirectory, "");

                return payload.inputDirectory;
              }

              return [];
          }
        }).flat().filter(Boolean) as string[];

        DEBUG && console.log("watching paths", paths);

        if (!activeWatcher) {
          activeWatcher = await watch({
            paths,
            onChange: (path, event) => {
              const match = Array.from(pathTypes.entries()).find(([p]) =>
                path.startsWith(p) || path.endsWith(p)
              );
              const extension = _path.extname(path);
              const name = _path.basename(path, extension);

              DEBUG && console.log("file-watcher - file changed", match);

              // When watching a directory, how to know a file belongs to one with a type
              // I.e., how to know the event came from watching a directory.
              // Likely that needs some path.resolve type of logic
              send("*", {
                type: "fileChanged",
                payload: {
                  path,
                  event,
                  extension,
                  name,
                  // TODO: Should type be allowed to be ""?
                  type: match ? match[1] : "",
                },
              });
            },
          });

          return;
        }

        await activeWatcher.addPaths(newPaths);
      },
      cleanUp() {
        activeWatcher?.close();
        activeWatcher = undefined;
      },
    };
  },
};

export { plugin };
