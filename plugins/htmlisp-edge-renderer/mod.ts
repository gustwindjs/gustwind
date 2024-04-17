import process from "node:process";
import { htmlispToHTML } from "../../htmlisp/mod.ts";
import { applyUtilities } from "../../htmlisp/utilities/applyUtility.ts";
import { defaultUtilities } from "../../htmlisp/defaultUtilities.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import type { GlobalUtilities, Plugin } from "../../types.ts";

// For edge renderer components are directly strings
type Components = Record<string, string>;

const DEBUG = process.env.DEBUG === "1";

// TODO: See if rendering should be decoupled from routing somehow to allow usage without a router
const plugin: Plugin<{
  components: Components;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
  globalUtilities: GlobalUtilities;
}, {
  components: Components;
  globalUtilities: GlobalUtilities;
}> = {
  meta: {
    name: "htmlisp-edge-renderer-plugin",
    description:
      "${name} implements an edge-compatible way to render through HTMLisp templating language.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({ options, mode, load, renderComponent }) {
    // TODO: Push this style check to the plugin system core
    if (!options.globalUtilities) {
      throw new Error(
        "htmlisp-edge-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    return {
      initPluginContext: () => {
        return options;
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
          ...route.meta,
          ...route.context,
        };

        return {
          context: {
            ...context,
            url,
            meta: await applyUtilities<Utility, Utilities, Context>(
              context,
              defaultUtilities,
              { context },
            ),
          },
        };
      },
      renderLayout: ({ routes, route, context, pluginContext }) => {
        const { components, globalUtilities } = pluginContext;
        const layout = components[route.layout];

        if (!layout) {
          throw new Error(
            "htmlisp-edge-renderer-plugin - layout to render was not found",
          );
        }

        const layoutUtilities = options.componentUtilities[route.layout];

        return htmlispToHTML({
          htmlInput: layout,
          components,
          context,
          utilities: {
            ...globalUtilities.init({ load, render: renderComponent, routes }),
            ...(layoutUtilities
              ? layoutUtilities.init({ load, render: renderComponent, routes })
              : {}),
          },
          componentUtilities: Object.fromEntries(
            Object.entries(options.componentUtilities).map((
              [k, v],
            ) => [
              k,
              v ? v.init({ load, render: renderComponent, routes }) : {},
            ]),
          ),
        });
      },
      renderComponent: (
        { routes, componentName, htmlInput, context, pluginContext },
      ) => {
        const { components, globalUtilities } = pluginContext;

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
          utilities: globalUtilities.init({
            load,
            render: renderComponent,
            routes,
          }),
          componentUtilities: Object.fromEntries(
            Object.entries(options.componentUtilities).map((
              [k, v],
            ) => [
              k,
              v ? v.init({ load, render: renderComponent, routes }) : {},
            ]),
          ),
        });
      },
      onMessage: ({ message, pluginContext }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            DEBUG &&
              console.log("htmlisp-edge-renderer - file changed", payload);

            switch (payload.type) {
              case "components": {
                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { components: options.components },
                };
              }
              case "globalUtilities": {
                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { globalUtilities: options.globalUtilities },
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
          case "getRenderer":
            return { result: pluginContext.components[payload] };
        }
      },
    };
  },
};

export { plugin };
