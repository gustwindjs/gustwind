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

export { fileWatcherPlugin as plugin, meta };
