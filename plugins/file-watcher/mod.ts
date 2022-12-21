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
    await load.json(pluginsPath);

    return {
      onTasksRegistered({ tasks, send }) {
        const paths = tasks.map(({ type, payload }) => {
          switch (type) {
            case "listDirectory":
            case "loadJSON":
            case "loadModule":
              return payload.path;
            case "writeScript":
              return payload.scriptPath;
            case "writeFiles":
              return payload.inputDirectory;
            case "watchPaths":
              return payload.paths;
          }
        }).filter(Boolean).flat() as string[]; // TS doesn't infer this case!

        DEBUG && console.log("watching paths", paths);

        watch({
          paths,
          onChange: (path, event) => {
            const extension = _path.extname(path);
            const name = _path.basename(path, extension);

            send("*", {
              type: "fileChanged",
              payload: { path, event, extension, name },
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
  const watcher = Deno.watchFs(paths.filter((p) => !p.startsWith("http")));

  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => onChange(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { plugin };
