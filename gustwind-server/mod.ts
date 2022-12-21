import { Server } from "https://deno.land/std@0.161.0/http/server.ts";
import { lookup } from "https://deno.land/x/media_types@v3.0.3/mod.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import {
  applyOnTasksRegistered,
  applyPlugins,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import type { LoadedPlugin } from "../gustwind-utilities/plugins.ts";
import { evaluateTasks } from "./evaluateTasks.ts";
import type { Mode, PluginOptions } from "../types.ts";

function serveGustwind({
  plugins: initialImportedPlugins,
  pluginDefinitions,
  mode,
  port,
}: {
  plugins?: LoadedPlugin[];
  pluginDefinitions: PluginOptions[];
  mode: Mode;
  port: number;
}) {
  const server = new Server({
    handler: async ({ url }) => {
      // This needs to happen per request since data (components etc.) might
      // update due to a change in the file system.
      const { plugins, router, tasks } = await importPlugins({
        initialImportedPlugins,
        pluginDefinitions,
        mode,
        // Output directory doesn't matter for the server since it's
        // using a virtual fs.
        outputDirectory: "/",
      });

      let fs = await evaluateTasks(tasks);

      const { pathname } = new URL(url);
      const matched = await router.matchRoute(pathname);

      if (matched && matched.route) {
        const { markup, tasks } = await applyPlugins({
          plugins,
          url: pathname,
          route: matched.route,
        });

        // Connect tasks that came from the router with plugins that are interested
        // in them (i.e., the file watcher).
        await applyOnTasksRegistered({ plugins, tasks: matched.tasks });

        fs = { ...fs, ...(await evaluateTasks(tasks)) };

        // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
        return respond(
          200,
          markup,
          matched.route.type === "xml"
            ? "text/xml"
            : "text/html; charset=utf-8",
        );
      }

      const matchedFsItem = fs[pathname];

      if (matchedFsItem) {
        switch (matchedFsItem.type) {
          case "file":
            return respond(200, matchedFsItem.data, lookup(pathname));
          case "path": {
            const assetPath = matchedFsItem.path;
            const asset = await Deno.readFile(assetPath);

            return respond(200, asset, lookup(assetPath));
          }
        }
      }

      return respond(404, "No matching route");
    },
  });
  const listener = Deno.listen({ port });

  return () => server.serve(listener);
}

/*
function compileRemoteGustwindScripts(repository: string, scripts: string[]) {
  const scriptsDirectory = "gustwind-scripts";

  return Promise.all(scripts.map(async (script) => {
    const { path } = await cache(
      `${repository}/${scriptsDirectory}/${script}`,
    );
    // TODO: Validate this one
    const name = script.split(".")[0];

    return compileScript({ name, path, mode: "development" });
  }));
}
*/

export { serveGustwind };
