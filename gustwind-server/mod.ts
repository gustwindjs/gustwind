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

async function serveGustwind({
  cwd,
  plugins: initialImportedPlugins,
  pluginDefinitions,
  mode,
  port,
}: {
  cwd: string;
  plugins?: LoadedPlugin[];
  pluginDefinitions: PluginOptions[];
  mode: Mode;
  port: number;
}) {
  let pathFs: Awaited<ReturnType<typeof evaluateTasks>> = {};
  const { plugins, router, tasks } = await importPlugins({
    cwd,
    initialImportedPlugins,
    pluginDefinitions,
    mode,
    // Output directory doesn't matter for the server since it's
    // using a virtual fs.
    outputDirectory: "/",
  });
  const server = new Server({
    handler: async ({ url }) => {
      const { pathname } = new URL(url);
      const matched = await router.matchRoute(pathname);

      if (matched && matched.route) {
        const { routes, tasks: routerTasks } = await router.getAllRoutes();
        const { markup, tasks } = await applyPlugins({
          plugins,
          url: pathname,
          routes,
          route: matched.route,
        });

        // Connect tasks that came from the router with plugins that are interested
        // in them (i.e., the file watcher).
        await applyOnTasksRegistered({ plugins, tasks: matched.tasks });

        // Capture potential assets created during evaluation as these might be
        // needed later for example in the editor.
        pathFs = await evaluateTasks(routerTasks.concat(tasks));

        // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
        return respond(
          200,
          markup,
          matched.route.url.endsWith(".xml")
            ? "text/xml"
            : "text/html; charset=utf-8",
        );
      }

      const fs = await evaluateTasks(tasks);
      const matchedFsItem = fs[pathname] || pathFs[pathname];

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

export { serveGustwind };
