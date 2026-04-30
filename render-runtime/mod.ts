import {
  applyMatchRoutes,
  applyPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initMemoryLoadApi } from "../load-adapters/memory.ts";
import type { InitLoadApi, LoadedPlugin, Plugin, Tasks } from "../types.ts";

type PluginDefinition = [Plugin, Record<string, unknown>];
type RenderFn = (
  pathname: string,
  initialContext: Record<string, unknown>,
) => Promise<{
  markup: string;
  tasks: Tasks;
}>;

async function initRender(
  initialPlugins: PluginDefinition[],
): Promise<RenderFn>;
async function initRender(
  initLoadApi: InitLoadApi,
  initialPlugins: PluginDefinition[],
): Promise<RenderFn>;
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

  return await createRender({
    cwd: "",
    outputDirectory: "",
    initLoadApi,
    initialImportedPlugins: await Promise.all(
      initialPlugins.map(([plugin, options]) =>
        importInitialPlugin({
          cwd: "",
          plugin,
          options,
          outputDirectory: "",
          initLoadApi,
        })
      ),
    ),
  });
}

async function createRender(
  {
    cwd,
    outputDirectory,
    initLoadApi,
    initialImportedPlugins,
  }: {
    cwd: string;
    outputDirectory: string;
    initLoadApi: InitLoadApi;
    initialImportedPlugins: LoadedPlugin[];
  },
) {
  const { plugins, router } = await importPlugins({
    cwd,
    initialImportedPlugins,
    pluginDefinitions: [],
    initLoadApi,
    outputDirectory,
    mode: "production",
  });
  const prepareTasks = await preparePlugins(plugins);
  const { routes, tasks: initialTasks } = await router.getAllRoutes();
  const startupTasks = prepareTasks.concat(initialTasks);

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

      return { markup, tasks: startupTasks.concat(routeTasks) };
    }

    throw new Error(`Failed to render ${pathname}`);
  };
}

async function importInitialPlugin(
  {
    cwd,
    plugin,
    options,
    outputDirectory,
    initLoadApi,
  }: {
    cwd: string;
    plugin: Plugin;
    options: Record<string, unknown>;
    outputDirectory: string;
    initLoadApi: InitLoadApi;
  },
): Promise<LoadedPlugin> {
  const tasks: Tasks = [];
  const api = await plugin.init({
    cwd,
    mode: "production",
    options,
    outputDirectory,
    renderComponent: () => Promise.resolve(""),
    renderComponentSync: () => "",
    load: initLoadApi(tasks),
  });

  return {
    plugin: {
      meta: plugin.meta,
      api,
      context: api.initPluginContext ? await api.initPluginContext() : {},
      moduleTasks: [],
      tasks,
    },
    tasks,
  };
}

export { createRender, initRender };
export type { PluginDefinition, RenderFn };
