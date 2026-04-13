import * as path from "node:path";
import { htmlispToHTML, htmlispToHTMLSync } from "../../htmlisp/mod.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import { applyUtilities } from "../../htmlisp/utilities/applyUtilities.ts";
import { defaultUtilities } from "../../htmlisp/defaultUtilities.ts";
import {
  createComponentDependencyGraph,
  type ComponentDependencyGraph,
  type ComponentSourceDefinition,
} from "../../utilities/componentDependencyGraph.ts";
import { initLoader } from "../../utilities/htmlLoader.ts";
import { createRuntimeUtilitiesResolver } from "../../utilities/runtimeUtilitiesCache.ts";
import type { BuildWorkerEvent, GlobalUtilities, Plugin } from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";

const DEBUG = isDebugEnabled();

const plugin: Plugin<{
  components: { path: string; selection?: string[] }[];
  globalUtilitiesPath: string;
}, {
  htmlLoader: ReturnType<typeof initLoader>;
  componentDefinitions: Record<string, ComponentSourceDefinition>;
  componentGraph: ComponentDependencyGraph;
  components: Record<string, string>;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
  globalDependencyTasks: BuildWorkerEvent[];
  globalUtilities: GlobalUtilities;
}> = {
  meta: {
    name: "htmlisp-renderer-plugin",
    description: "${name} allows rendering using HTMLisp templating language.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({
    cwd,
    options,
    load,
    renderComponent,
    renderComponentSync,
    mode,
  }) {
    const { components, globalUtilitiesPath } = options;
    const getRuntimeUtilities = createRuntimeUtilitiesResolver({
      load,
      render: renderComponent,
      renderSync: renderComponentSync,
    });

    // TODO: Push the check to the plugin system core
    if (!globalUtilitiesPath) {
      throw new Error(
        "htmlisp-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    return {
      initPluginContext: async () => {
        const htmlLoader = initLoader({
          cwd,
          loadDir: load.dir,
          loadModule: (path) =>
            load.module<GlobalUtilities>({ path, type: "globalUtilities" }),
          readTextFile: load.textFile,
        });
        const [
          {
            componentDefinitions,
            componentGraph,
            components,
            componentUtilities,
          },
          globalUtilities,
        ] =
          await Promise.all([
            loadComponents(htmlLoader),
            loadGlobalUtilities(),
          ]);

        return {
          htmlLoader,
          componentDefinitions,
          componentGraph,
          components,
          componentUtilities,
          globalDependencyTasks: getGlobalDependencyTasks(),
          globalUtilities,
        };
      },
      sendMessages: async () => undefined,
      prepareContext: async ({ url, route, send }) => {
        const meta = await send("gustwind-meta-plugin", {
          type: "getMeta",
          payload: undefined,
        });
        const runtimeMeta: Record<string, string> = {
          built: (new Date()).toString(),
        };

        if (mode === "development") {
          runtimeMeta.url = url;
        }

        const context = {
          ...route.context,
          meta: {
            ...runtimeMeta,
            // @ts-expect-error This is fine
            ...meta,
            // @ts-expect-error This is fine
            ...route.context?.meta,
          },
        };
        const appliedContext = await applyUtilities<
          Utility,
          Utilities,
          Context
        >(
          context,
          defaultUtilities,
          { context },
        );

        return {
          context: { ...context, ...appliedContext, url },
        };
      },
      renderLayout: ({ matchRoute, route, context, url, pluginContext }) => {
        const { components, componentUtilities, globalUtilities } =
          pluginContext;

        const layout = components[route.layout];

        if (!layout) {
          throw new Error(
            `htmlisp-renderer-plugin - layout ${route.layout} to render was not found for url ${url}`,
          );
        }

        const layoutUtilities = componentUtilities[route.layout];
        const runtimeUtilities = getRuntimeUtilities({
          componentUtilities,
          globalUtilities,
          matchRoute,
          url,
        });

        return htmlispToHTML({
          htmlInput: layout,
          components,
          context,
          utilities: {
            ...runtimeUtilities.utilities,
            ...(layoutUtilities
              ? layoutUtilities.init({
                load,
                render: renderComponent,
                renderSync: renderComponentSync,
                matchRoute,
                url,
              })
              : {}),
          },
          componentUtilities: runtimeUtilities.componentUtilities,
        });
      },
      renderComponent: (
        { matchRoute, componentName, htmlInput, context, props, pluginContext },
      ) => {
        const { components, componentUtilities, globalUtilities } =
          pluginContext;

        if (componentName) {
          htmlInput = components[componentName];

          if (!htmlInput) {
            throw new Error(
              `Component ${componentName} was not found to render`,
            );
          }
        }

        const runtimeUtilities = getRuntimeUtilities({
          componentUtilities,
          globalUtilities,
          matchRoute,
          url: "",
        });

        return htmlispToHTML({
          htmlInput,
          components,
          context,
          props,
          utilities: runtimeUtilities.utilities,
          componentUtilities: runtimeUtilities.componentUtilities,
        });
      },
      renderComponentSync: (
        { matchRoute, componentName, htmlInput, context, props, pluginContext },
      ) => {
        const { components, componentUtilities, globalUtilities } =
          pluginContext;

        if (componentName) {
          htmlInput = components[componentName];

          if (!htmlInput) {
            throw new Error(
              `Component ${componentName} was not found to render`,
            );
          }
        }

        const runtimeUtilities = getRuntimeUtilities({
          componentUtilities,
          globalUtilities,
          matchRoute,
          url: "",
        });

        return htmlispToHTMLSync({
          htmlInput,
          components,
          context,
          props,
          utilities: runtimeUtilities.utilities,
          componentUtilities: runtimeUtilities.componentUtilities,
        });
      },
      onMessage: async ({ message, pluginContext }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            DEBUG && console.log("htmlisp-renderer - file changed", payload);

            if (payload.type === "paths") {
              return { send: [{ type: "reloadPage", payload: undefined }] };
            }

            const nextPluginContext: Partial<typeof pluginContext> = {};
            const shouldReloadComponents = payload.type === "components" ||
              isComponentSourcePath(payload.path);
            const shouldReloadGlobalUtilities = payload.type === "globalUtilities" ||
              isGlobalUtilitiesPath(payload.path);

            if (shouldReloadComponents) {
              Object.assign(
                nextPluginContext,
                await loadComponents(pluginContext.htmlLoader),
              );
            }

            if (shouldReloadGlobalUtilities) {
              nextPluginContext.globalUtilities = await loadGlobalUtilities();
            }

            return {
              send: [{ type: "reloadPage", payload: undefined }],
              pluginContext: nextPluginContext,
            };
          }
          case "getComponents":
            return { result: pluginContext.components };
          case "getComponentDependencyGraph":
            return {
              result: {
                componentGraph: pluginContext.componentGraph,
                globalDependencyTasks: pluginContext.globalDependencyTasks,
              },
            };
          case "getRenderer": {
            return { result: pluginContext.components[payload] };
          }
        }
      },
    };

    // This function looks into different component paths, loads them,
    // and finally aggregates them into a single data structure.
    async function loadComponents(
      htmlLoader: ReturnType<typeof initLoader>,
    ): Promise<{
      componentDefinitions: Record<string, ComponentSourceDefinition>;
      componentGraph: ComponentDependencyGraph;
      components: Record<string, string>;
      componentUtilities: Record<string, GlobalUtilities | undefined>;
    }> {
      const loadedComponents = await Promise.all(
        components.map(
          ({ path: componentsPath, selection }) =>
            htmlLoader(componentsPath, selection),
        ),
      );
      const componentDefinitions = Object.assign(
        {},
        ...loadedComponents.map(({ componentDefinitions }) => componentDefinitions),
      );

      return {
        componentDefinitions,
        componentGraph: createComponentDependencyGraph(componentDefinitions),
        components: Object.assign(
          {},
          ...loadedComponents.map(({ components }) => components),
        ),
        componentUtilities: Object.assign(
          {},
          ...loadedComponents.map(({ componentUtilities }) =>
            componentUtilities
          ),
        ),
      };
    }

    async function loadGlobalUtilities() {
      return globalUtilitiesPath
        ? await load.module<GlobalUtilities>({
          path: path.join(cwd, globalUtilitiesPath),
          type: "globalUtilities",
        })
        : { init: () => ({}) };
    }

    function getGlobalDependencyTasks() {
      return globalUtilitiesPath
        ? [{
          type: "loadModule" as const,
          payload: {
            path: path.join(cwd, globalUtilitiesPath),
            type: "globalUtilities",
          },
        }]
        : [];
    }

    function isComponentSourcePath(filePath: string) {
      return components.some(({ path: componentsPath }) =>
        !componentsPath.startsWith("http") &&
        isWithinPath(filePath, path.join(cwd, componentsPath))
      );
    }

    function isGlobalUtilitiesPath(filePath: string) {
      return globalUtilitiesPath
        ? path.resolve(filePath) === path.resolve(path.join(cwd, globalUtilitiesPath))
        : false;
    }

    function isWithinPath(filePath: string, directoryPath: string) {
      const resolvedFilePath = path.resolve(filePath);
      const resolvedDirectoryPath = path.resolve(directoryPath);

      return resolvedFilePath === resolvedDirectoryPath ||
        resolvedFilePath.startsWith(resolvedDirectoryPath + path.sep);
    }

  },
};

export { plugin };
