import {
  applyMatchRoutes,
  applyPlugins,
  importPlugin,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initMemoryLoadApi } from "../load-adapters/memory.ts";
import type { InitLoadApi, Plugin } from "../types.ts";

type PluginDefinition = [Plugin, Record<string, unknown>];

async function initRender(
  initialPlugins: PluginDefinition[],
): Promise<
  (pathname: string, initialContext: Record<string, unknown>) => Promise<{
    markup: string;
    tasks: import("../types.ts").Tasks;
  }>
>;
async function initRender(
  initLoadApi: InitLoadApi, // TODO: Add a default implementation of the load api for node
  initialPlugins: PluginDefinition[],
): Promise<
  (pathname: string, initialContext: Record<string, unknown>) => Promise<{
    markup: string;
    tasks: import("../types.ts").Tasks;
  }>
>;
async function initRender(
  initLoadApiOrInitialPlugins: InitLoadApi | PluginDefinition[],
  maybeInitialPlugins?: PluginDefinition[],
) {
  const initLoadApi = Array.isArray(initLoadApiOrInitialPlugins)
    ? initMemoryLoadApi
    : initLoadApiOrInitialPlugins;
  const initialPlugins = Array.isArray(initLoadApiOrInitialPlugins)
    ? initLoadApiOrInitialPlugins
    : maybeInitialPlugins;

  if (!initialPlugins) {
    throw new Error("Missing initial plugins");
  }

  const initialImportedPlugins = await Promise.all(
    initialPlugins.map(([plugin, options]) =>
      importPlugin({
        cwd: "",
        pluginModule: plugin,
        options,
        outputDirectory: "",
        initLoadApi,
        mode: "production",
      })
    ),
  );

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
    const matched = await router.matchRoute(pathname);

    if (matched) {
      const { markup, tasks: routeTasks } = await applyPlugins({
        plugins,
        url: pathname,
        route: matched,
        initialContext,
        matchRoute(url: string) {
          return applyMatchRoutes({ plugins, url });
        },
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
