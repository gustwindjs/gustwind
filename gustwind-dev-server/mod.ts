import { contentType } from "https://deno.land/std@0.207.0/media_types/mod.ts";
import { path } from "../server-deps.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import {
  applyOnTasksRegistered,
  applyPlugins,
  finishPlugins,
  importPlugins,
  type LoadedPlugin,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { evaluateTasks } from "./evaluateTasks.ts";
import type { Mode, PluginOptions } from "../types.ts";

async function gustwindDevServer({
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
  const { plugins, router } = await importPlugins({
    cwd,
    initialImportedPlugins,
    pluginDefinitions,
    mode,
    // Output directory doesn't matter for the server since it's
    // using a virtual fs.
    outputDirectory: "",
  });

  return async () => {
    const { routes } = await router.getAllRoutes();

    await Deno.serve({ port }, async ({ url }) => {
      const { pathname } = new URL(url);
      const matched = await router.matchRoute(routes, pathname);

      if (matched && matched.route) {
        const { markup, tasks } = await applyPlugins({
          plugins,
          url: pathname,
          routes: matched.allRoutes,
          route: matched.route,
        });

        // Connect tasks that came from the router with plugins that are interested
        // in them (i.e., the file watcher).
        await applyOnTasksRegistered({ plugins, tasks: matched.tasks });

        // Capture potential assets created during evaluation as these might be
        // needed later for example in the editor.
        pathFs = await evaluateTasks(tasks);

        // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
        return respond(
          200,
          markup,
          matched.route.url.endsWith(".xml")
            ? "text/xml"
            : "text/html; charset=utf-8",
        );
      }

      const prepareTasks = await preparePlugins(plugins);
      const finalTasks = await finishPlugins(plugins);
      const fs = await evaluateTasks(prepareTasks.concat(finalTasks));
      const matchedFsItem = fs[pathname] || pathFs[pathname];

      if (matchedFsItem) {
        switch (matchedFsItem.type) {
          case "file":
            return respond(
              200,
              matchedFsItem.data,
              contentType(path.extname(pathname)),
            );
          case "path": {
            const assetPath = matchedFsItem.path;
            const asset = await Deno.readFile(assetPath);

            return respond(200, asset, contentType(path.extname(assetPath)));
          }
        }
      }

      return respond(404, "No matching route");
    });

    return { routes, plugins };
  };
}

export { gustwindDevServer };
