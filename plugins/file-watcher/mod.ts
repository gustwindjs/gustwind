import { path as _path } from "../../server-deps.ts";
import { watch } from "../../utilities/watch.ts";
import type { Plugin } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const plugin: Plugin<{ pluginsPath: string }> = {
  meta: {
    name: "file-watcher-plugin",
  },
  init: async ({ mode, load, options: { pluginsPath } }) => {
    if (mode !== "development") {
      return {};
    }

    // Connect plugins.json path with the file watcher
    await load.json({ path: pluginsPath, type: "plugins" });

    return {
      // TODO: Add logic to capture paths that are added **after**
      // onTasksRegistered has triggered. The question is how to
      // add files to Deno.watchFs after it has been created initially.
      onTasksRegistered({ tasks, send }) {
        const pathTypes: { path: string; type: string }[] = [];
        const paths = tasks.map(({ type, payload }) => {
          switch (type) {
            case "readTextFile":
            case "listDirectory":
            case "loadJSON":
            case "loadModule": {
              pathTypes.push({ path: payload.path, type: payload.type });

              return payload.path;
            }
            // TODO: Should these capture types as well?
            case "writeScript":
              return payload.scriptPath;
            case "writeFiles":
              return payload.inputDirectory;
          }
        }).filter(Boolean).flat() as string[]; // TS doesn't infer this case!

        DEBUG && console.log("watching paths", paths);

        watch({
          paths,
          onChange: (path, event) => {
            const match = pathTypes.find(({ path: p }) =>
              path.startsWith(p) || path.endsWith(p)
            );
            const extension = _path.extname(path);
            const name = _path.basename(path, extension);

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
                type: match ? match.type : "",
              },
            });
          },
        });
      },
    };
  },
};

export { plugin };
