import { buildNode } from "./build.ts";
import { importPlugin } from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initNodeLoadApi } from "../load-adapters/node.ts";
import {
  createRender,
  initRender,
} from "../render-runtime/mod.ts";
import type { RenderFn } from "../render-runtime/mod.ts";
import {
  validateHtmlDirectory,
  validateHtmlDocument,
} from "../utilities/htmlValidation.ts";
import type { InitLoadApi, Plugin, Tasks } from "../types.ts";
type NodePluginDefinition = [Plugin | string, Record<string, unknown>];

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
    initialImportedPlugins: await Promise.all(
      initialPlugins.map(([plugin, options]) =>
        importInitialPlugin({
          cwd,
          plugin,
          options,
          outputDirectory,
          initLoadApi: initNodeLoadApi,
        })
      ),
    ),
  });
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
    path: await resolvePluginPath(cwd, pluginPath),
    type: "plugins",
  });
  const pluginModule = exports.plugin || exports.default;

  if (!pluginModule) {
    throw new Error(`Failed to load plugin from ${pluginPath}`);
  }

  return pluginModule;
}

async function resolvePluginPath(cwd: string, pluginPath: string) {
  if (
    ["file:", "http://", "https://"].some((prefix) => pluginPath.startsWith(prefix)) ||
    pluginPath.startsWith("/")
  ) {
    return pluginPath;
  }

  const { resolve } = await import("node:path");
  return resolve(cwd, pluginPath);
}

export type * from "../types.ts";
export {
  buildNode,
  initNodeRender,
  initRender,
  validateHtmlDirectory,
  validateHtmlDocument,
};
export type { BuildBenchmark, BuildNodeResult } from "./build.ts";
