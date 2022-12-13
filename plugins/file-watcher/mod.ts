import { async } from "../../server-deps.ts";
import type { Mode, Plugin, PluginMeta } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const meta: PluginMeta = {
  name: "gustwind-script-plugin",
};

// TODO: How to watch project meta.json
function fileWatcherPlugin(
  { mode }: { mode: Mode },
): Plugin {
  if (mode !== "development") {
    return {};
  }

  return {
    onTasksRegistered(tasks) {
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
        }
      }).filter(Boolean) as string[]; // TS doesn't infer this case!

      DEBUG && console.log("watching paths", paths);

      watch({
        paths,
        onChange: (path, event) => {
          console.log("a change happened", path, event);
        },
      });
    },
  };
}

async function watch({
  paths,
  onChange,
  debounceDelay,
}: {
  paths: string[];
  onChange: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}) {
  const watcher = Deno.watchFs(paths);

  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => onChange(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { fileWatcherPlugin as plugin, meta };
