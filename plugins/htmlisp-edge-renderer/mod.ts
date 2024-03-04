import process from "node:process";
import breezewind from "../../breezewind/mod.ts";
import type { ComponentUtilities, Utilities } from "../../breezewind/types.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import { getComponents } from "../../gustwind-utilities/getComponents.ts";
import type { Components, Plugin } from "../../types.ts";

const DEBUG = process.env.DEBUG === "1";

// TODO: Add HTML -> Gustwind conversion step to a good spot
// TODO: See if rendering should be decoupled from routing somehow to allow usage without a router
const plugin: Plugin<{
  components: Components;
  componentUtilities: ComponentUtilities;
  globalUtilities: Utilities;
}, {
  components: Components;
  globalUtilities: Utilities;
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
      render: ({ route, context, pluginContext }) => {
        const { components, globalUtilities } = pluginContext;

        return renderHTML({
          component: components[route.layout].component,
          components: getComponents(components),
          context,
          globalUtilities,
          componentUtilities: options.componentUtilities,
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
            return { result: getComponents(pluginContext.components) };
          case "getRenderer":
            return { result: pluginContext.components[payload].component };
        }
      },
    };
  },
};

// TODO: Same as for htmlisp-renderer -> push to utilities
function renderHTML(
  { component, components, context, globalUtilities, componentUtilities }:
    Parameters<
      typeof breezewind
    >[0],
) {
  return breezewind({
    component,
    components,
    extensions: [
      // It's important visibleIf evaluates before the others to avoid work
      breezeExtensions.visibleIf,
      breezeExtensions.foreach,
    ],
    context,
    globalUtilities,
    componentUtilities,
  });
}

export { plugin, renderHTML };
