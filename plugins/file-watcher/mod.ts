import { path as _path } from "../../server-deps.ts";
import * as async from "https://deno.land/std@0.161.0/async/mod.ts";
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
    // TODO: How to restart compilation on change in this case?
    await load.json({ path: pluginsPath, type: "plugins" });

    return {
      onTasksRegistered({ tasks, send }) {
        const pathTypes: { path: string; type: string }[] = [];
        const paths = tasks.map(({ type, payload }) => {
          switch (type) {
            case "listDirectory":
            case "loadJSON":
            case "loadModule": {
              pathTypes.push({ path: payload.path, type: payload.type });

              return payload.path;
            }
            case "watchPaths": {
              payload.paths.forEach((path) =>
                pathTypes.push({ path, type: payload.type })
              );

              return payload.paths;
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

async function watch({
  paths,
  onChange,
  debounceDelay,
}: {
  paths: string[];
  onChange: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}) {
  // The watcher will crash hard if there's even a single invalid path
  const pathsToWatch = (await Promise.all(
    paths.filter(Boolean).filter((p) => !p.startsWith("http")).map(
      async (p) => {
        try {
          await Deno.lstat(p);

          return p;
        } catch (_) {
          return;
        }
      },
    ),
  )).filter(Boolean) as string[];

  const watcher = Deno.watchFs(pathsToWatch);
  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => onChange(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { plugin };
