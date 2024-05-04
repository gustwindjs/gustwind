import * as path from "node:path";
import { contentType } from "https://deno.land/std@0.207.0/media_types/mod.ts";
import { initLoadApi } from "../load-adapters/deno.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import {
  applyMatchRoutes,
  applyPlugins,
  finishPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { evaluateTasks } from "./evaluateTasks.ts";
import type { LoadedPlugin, Mode, PluginOptions } from "../types.ts";

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
    initLoadApi,
    // Output directory doesn't matter for the server since it's
    // using a virtual fs.
    outputDirectory: "",
  });

  return async () => {
    // TODO: It might be a good idea to defer this work and check only
    // when a request arrives or push this process to a background worker (or both)
    const { routes } = await router.getAllRoutes();

    await Deno.serve({ port }, async ({ url }) => {
      const { pathname } = new URL(url);
      const matchedRoute = await router.matchRoute(pathname);

      if (matchedRoute) {
        const { markup, tasks } = await applyPlugins({
          plugins,
          url: pathname,
          route: matchedRoute,
          matchRoute: (url: string) => applyMatchRoutes({ plugins, url }),
        });

        // Capture potential assets created during evaluation as these might be
        // needed later for example in the editor.
        pathFs = await evaluateTasks(tasks);

        // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
        return respond(
          200,
          markup,
          url.endsWith(".xml") ? "text/xml" : "text/html; charset=utf-8",
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

      return respond(
        404,
        `No matching route in ${Object.keys(routes).join(", ")}.`,
      );
    });

    return { routes, plugins };
  };
}

export { gustwindDevServer };
