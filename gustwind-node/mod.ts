import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import type { InitLoadApi, LoadedPlugin } from "../types.ts";

async function initRender(
  initLoadApi: InitLoadApi, // TODO: Add a default implementation of the load api for node
  initialImportedPlugins: LoadedPlugin[],
) {
  const { plugins, router } = await importPlugins({
    cwd: "",
    initialImportedPlugins,
    pluginDefinitions: [],
    initLoadApi,
    outputDirectory: "",
    mode: "production",
  });
  const { routes, tasks: initialTasks } = await router.getAllRoutes();

  return async function render(
    pathname: string,
    initialContext: Record<string, unknown>,
  ) {
    const matched = await router.matchRoute(routes, pathname);

    if (matched && matched.route) {
      const { markup, tasks: routeTasks } = await applyPlugins({
        plugins,
        url: pathname,
        routes,
        route: matched.route,
        initialContext,
      });

      // Both markup and tasks are returned. The idea is that the consumer can
      // decide what to do with either. For example on edge you might want to
      // handle the tasks dynamically by writing task results to KV and then
      // map to the database through a router on demand.
      return { markup, tasks: initialTasks.concat(routeTasks) };
    }

    throw new Error(`Failed to render ${pathname}`);
  };
}

export type * from "../types.ts";
export { initRender };
