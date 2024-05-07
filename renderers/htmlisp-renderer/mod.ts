import * as path from "node:path";
import { htmlispToHTML, htmlispToHTMLSync } from "../../htmlisp/mod.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import { applyUtilities } from "../../htmlisp/utilities/applyUtility.ts";
// import { attachIds } from "../../utilities/attachIds.ts";
import { defaultUtilities } from "../../htmlisp/defaultUtilities.ts";
import { initLoader } from "../../utilities/htmlLoader.ts";
import type { GlobalUtilities, Plugin } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const plugin: Plugin<{
  components: { path: string; selection?: string[] }[];
  globalUtilitiesPath: string;
}, {
  htmlLoader: ReturnType<typeof initLoader>;
  components: Record<string, string>;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
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
        });
        const [{ components, componentUtilities }, globalUtilities] =
          await Promise.all([
            loadComponents(htmlLoader),
            loadGlobalUtilities(),
          ]);

        return { htmlLoader, components, componentUtilities, globalUtilities };
      },
      sendMessages: async ({ send, pluginContext }) => {
        // TODO: Redo/restore this portion
        /*
        const editorExists = await send("gustwind-editor-plugin", {
          type: "ping",
          payload: undefined,
        });

        if (!editorExists) {
          return;
        }

        const componentFilePath = await Deno.makeTempFile({ suffix: ".js" });
        const componentUtilitiesSource = generateComponentUtilitiesSource(
          pluginContext.components,
        );
        await Deno.writeTextFile(componentFilePath, componentUtilitiesSource);

        if (globalUtilitiesPath) {
          send("gustwind-script-plugin", {
            type: "addScripts",
            payload: [{
              isExternal: true,
              localPath: globalUtilitiesPath,
              remotePath: globalUtilitiesPath,
              name: "globalUtilities.js",
              externals: [],
            }],
          });
        }

        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: [{
            isExternal: true,
            localPath: componentFilePath,
            remotePath: componentFilePath,
            name: "componentUtilities.js",
            externals: [],
          }],
        });
        */
      },
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
          ...runtimeMeta,
          // @ts-expect-error Figure out how to type this
          ...meta,
          ...route.context,
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
          context: { ...context, url, ...appliedContext },
        };
      },
      renderLayout: ({ matchRoute, route, context, url, pluginContext }) => {
        const { components, componentUtilities, globalUtilities } =
          pluginContext;

        // TODO: Figure out if this needs to be restored
        /*
        const editorExists = await send("gustwind-editor-plugin", {
          type: "ping",
          payload: undefined,
        });


        if (editorExists) {
          // TODO: Consider caching this (html + xml separately) to speed things up
          componentsLookup = attachIdsToComponents(
            url,
            componentsLookup,
          );
        }
        */

        const layout = components[route.layout];

        if (!layout) {
          throw new Error(
            `htmlisp-renderer-plugin - layout ${route.layout} to render was not found for url ${url}`,
          );
        }

        const layoutUtilities = componentUtilities[route.layout];

        return htmlispToHTML({
          htmlInput: layout,
          components,
          context,
          utilities: {
            ...globalUtilities.init({
              load,
              render: renderComponent,
              renderSync: renderComponentSync,
              matchRoute,
              url,
            }),
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
          componentUtilities: Object.fromEntries(
            Object.entries(componentUtilities).map((
              [k, v],
            ) => [
              k,
              v
                ? v.init({
                  load,
                  render: renderComponent,
                  renderSync: renderComponentSync,
                  matchRoute,
                  url,
                })
                : {},
            ]),
          ),
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

        return htmlispToHTML({
          htmlInput,
          components,
          context,
          props,
          utilities: globalUtilities.init({
            load,
            render: renderComponent,
            renderSync: renderComponentSync,
            matchRoute,
            url: "",
          }),
          componentUtilities: Object.fromEntries(
            Object.entries(componentUtilities).map((
              [k, v],
            ) => [
              k,
              v
                ? v.init({
                  load,
                  render: renderComponent,
                  renderSync: renderComponentSync,
                  matchRoute,
                  url: "",
                })
                : {},
            ]),
          ),
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

        return htmlispToHTMLSync({
          htmlInput,
          components,
          context,
          props,
          utilities: globalUtilities.init({
            load,
            render: renderComponent,
            renderSync: renderComponentSync,
            matchRoute,
            url: "",
          }),
          componentUtilities: Object.fromEntries(
            Object.entries(componentUtilities).map((
              [k, v],
            ) => [
              k,
              v
                ? v.init({
                  load,
                  render: renderComponent,
                  renderSync: renderComponentSync,
                  matchRoute,
                  url: "",
                })
                : {},
            ]),
          ),
        });
      },
      onMessage: async ({ message, pluginContext }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            DEBUG && console.log("htmlisp-renderer - file changed", payload);

            switch (payload.type) {
              case "components": {
                const { components } = await loadComponents(
                  pluginContext.htmlLoader,
                );

                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { components },
                };
              }

              case "globalUtilities": {
                const globalUtilities = await loadGlobalUtilities();

                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { globalUtilities },
                };
              }
              case "paths": {
                return { send: [{ type: "reloadPage", payload: undefined }] };
              }
            }

            // Reload anyway
            return { send: [{ type: "reloadPage", payload: undefined }] };
          }
          case "getComponents":
            return { result: pluginContext.components };
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
    ): ReturnType<ReturnType<typeof initLoader>> {
      const loadedComponents = await Promise.all(
        components.map(
          ({ path: componentsPath, selection }) =>
            htmlLoader(componentsPath, selection),
        ),
      );

      return {
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
  },
};

/*
function generateComponentUtilitiesSource(components: Components) {
  const componentsWithUtilities = Object.entries(components).map((
    [name, { utilitiesPath }],
  ) => utilitiesPath && [name, utilitiesPath]).filter(Boolean);

  return `${
    componentsWithUtilities.map(([name, path]) =>
      `import * as ${name} from "${path}";`
    ).join("\n")
  }

const init = (args) => {
  const componentUtilities = [
${
    componentsWithUtilities.map(([name]) =>
      `    ["${name}", ${name}.init(args)],`
    )
      .join("\n")
  }
  ].filter(Boolean);

  return Object.fromEntries(componentUtilities);
}

export { init };`;
}

function attachIdsToComponents(
  url: string,
  components: BreezewindComponents,
): BreezewindComponents {
  return Object.fromEntries(
    Object.entries(components).map((
      [k, v],
    ) => [k, url.endsWith(".xml") ? v : attachIds(v)]),
  );
}
*/

export { plugin };
