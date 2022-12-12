import { async } from "../../server-deps.ts";
import type { Plugin, PluginMeta } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-script-plugin",
};

function fileWatcherPlugin(): Plugin {
  // TODO: Set up a file watcher here
  // It should be able to aggregate files to watch automatically
  // and trigger a message when there's a change.
  // Then another plugin (for example web socket plugin), can
  // react to that and update the clients.
  return {};
}

async function watch({
  directory,
  handler,
  debounceDelay,
}: {
  directory: string;
  handler: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}) {
  const watcher = Deno.watchFs(directory);

  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => handler(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { fileWatcherPlugin as plugin, meta };
