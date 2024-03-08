import process from "node:process";
import { htmlToBreezewind } from "../../htmlisp/mod.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import {
  getComponentUtilities,
  getGlobalUtilities,
} from "../../gustwind-utilities/getUtilities.ts";
import { renderComponent } from "../../gustwind-utilities/renderComponent.ts";
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
  init({ options, mode }) {
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
            meta: await applyUtilities(
              context,
              // @ts-expect-error This is ok
              defaultUtilities,
              { context },
            ),
          },
        };
      },
      render: ({ routes, route, context, pluginContext }) => {
        const { components, globalUtilities } = pluginContext;
        const componentsLookup = getComponents(components);
        const layout = componentsLookup[route.layout];

        if (!layout) {
          throw new Error(
            "htmlisp-edge-renderer-plugin - layout to render was not found",
          );
        }

        const layoutUtilities = options.componentUtilities[route.layout];

        return renderComponent({
          component: layout,
          components: componentsLookup,
          context,
          globalUtilities: getGlobalUtilities({
            globalUtilities,
            layoutUtilities: layoutUtilities
              ? layoutUtilities.init({ routes })
              : {},
            routes,
          }),
          componentUtilities: getComponentUtilities({
            componentUtilities: options.componentUtilities,
            routes,
          }),
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

function getComponents(
  components: Components,
) {
  return Object.fromEntries(
    Object.entries(components).map((
      [k, v],
    ) => [k, htmlToBreezewind(v)]),
  );
}

export { plugin };
