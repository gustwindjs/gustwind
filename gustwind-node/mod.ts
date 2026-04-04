import * as path from "node:path";
import { buildNode } from "./build.ts";
import {
  applyMatchRoutes,
  applyPlugins,
  importPlugin,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initMemoryLoadApi } from "../load-adapters/memory.ts";
import { initLoadApi as initNodeLoadApi } from "../load-adapters/node.ts";
import type { InitLoadApi, Plugin, Tasks } from "../types.ts";

type PluginDefinition = [Plugin, Record<string, unknown>];
type NodePluginDefinition = [Plugin | string, Record<string, unknown>];
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
  initLoadApi: InitLoadApi, // TODO: Add a default implementation of the load api for node
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
    initialPlugins,
  });
}

async function initNodeRender(
  {
    cwd,
    initialPlugins,
    outputDirectory = "",
  }: {
    cwd: string;
    initialPlugins: NodePluginDefinition[];
    outputDirectory?: string;
  },
): Promise<RenderFn> {
  return await createRender({
    cwd,
    outputDirectory,
    initLoadApi: initNodeLoadApi,
    initialPlugins,
  });
}

async function createRender(
  {
    cwd,
    outputDirectory,
    initLoadApi,
    initialPlugins,
  }: {
    cwd: string;
    outputDirectory: string;
    initLoadApi: InitLoadApi;
    initialPlugins: NodePluginDefinition[];
  },
) {

  const initialImportedPlugins = await Promise.all(
    initialPlugins.map(([plugin, options]) =>
      importInitialPlugin({
        cwd,
        plugin,
        options,
        outputDirectory,
        initLoadApi,
      })
    ),
  );

  const { plugins, router } = await importPlugins({
    cwd,
    initialImportedPlugins,
    pluginDefinitions: [],
    initLoadApi,
    outputDirectory,
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

async function importInitialPlugin(
  {
    cwd,
    plugin,
    options,
    outputDirectory,
    initLoadApi,
  }: {
    cwd: string;
    plugin: Plugin | string;
    options: Record<string, unknown>;
    outputDirectory: string;
    initLoadApi: InitLoadApi;
  },
) {
  const pluginModule = typeof plugin === "string"
    ? await loadInitialPluginModule({ cwd, pluginPath: plugin, initLoadApi })
    : plugin;

  return await importPlugin({
    cwd,
    pluginModule,
    options,
    outputDirectory,
    initLoadApi,
    mode: "production",
  });
}

async function loadInitialPluginModule(
  {
    cwd,
    pluginPath,
    initLoadApi,
  }: {
    cwd: string;
    pluginPath: string;
    initLoadApi: InitLoadApi;
  },
) {
  if (!cwd) {
    throw new Error(
      "String plugin references require a filesystem-backed current working directory",
    );
  }

  const exports = await initLoadApi([]).module<{
    default?: Plugin;
    plugin?: Plugin;
  }>({
    path: resolvePluginPath(cwd, pluginPath),
    type: "plugins",
  });
  const pluginModule = exports.plugin || exports.default;

  if (!pluginModule) {
    throw new Error(`Failed to load plugin from ${pluginPath}`);
  }

  return pluginModule;
}

function resolvePluginPath(cwd: string, pluginPath: string) {
  return ["file:", "http://", "https://"].some((prefix) =>
      pluginPath.startsWith(prefix)
    ) || pluginPath.startsWith("/")
    ? pluginPath
    : path.resolve(cwd, pluginPath);
}

export type * from "../types.ts";
export { buildNode, initNodeRender, initRender };
