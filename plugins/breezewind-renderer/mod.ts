import { tw } from "../../client-deps.ts";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { Component } from "../../breezewind/types.ts";
import type { Plugin, PluginMeta, PluginParameters } from "../../types.ts";

const meta: PluginMeta = {
  name: "breezewind-renderer-plugin",
  dependsOn: [],
};

async function breezewindRenderer(
  { options: { componentsPath, layoutsPath, pageUtilitiesPath } }:
    PluginParameters<
      {
        componentsPath: string;
        layoutsPath: string;
        pageUtilitiesPath: string;
      }
    >,
): Promise<Plugin> {
  const cwd = Deno.cwd();

  // TODO: Use this for cache busting modules in watch mode
  // "?cache=" +
  // new Date().getTime()
  //
  // Maybe it's a good default for an import helper
  let [components, layouts, pageUtilities] = await Promise.all([
    getDefinitions<Component>(path.join(cwd, componentsPath)),
    getDefinitions<Component>(path.join(cwd, layoutsPath)),
    pageUtilitiesPath
      ? await import("file://" + path.join(cwd, pageUtilitiesPath))
      : {},
  ]);

  return {
    render: ({ route, context }) =>
      renderHTML({
        component: layouts[route.layout],
        components,
        context,
        utilities: pageUtilities,
      }),
    onMessage: (
      { type, payload }:
        | { type: "get-components"; payload: undefined }
        | {
          type: "update-components";
          payload: Component;
        }
        | { type: "get-renderer"; payload: string }
        | { type: "get-layouts"; payload: undefined }
        | { type: "update-layouts"; payload: Component },
    ) => {
      switch (type) {
        case "get-components":
          return components;
        case "get-layouts":
          return layouts;
        case "get-renderer":
          return layouts[payload];
        case "update-components":
          // @ts-expect-error This is fine.
          components = payload;
          break;
        case "update-layouts":
          // @ts-expect-error This is fine.
          layouts = payload;
          break;
        default:
          throw new Error(
            `breezewind-renderer-plugin - Unknown message type: ${type}`,
          );
      }
    },
  };
}

function renderHTML(
  { component, components, context, utilities }: Parameters<
    typeof breezewind
  >[0],
) {
  return breezewind({
    component,
    components,
    extensions: [
      // TODO: Allow defining these through configuration
      breezeExtensions.classShortcut(tw),
      breezeExtensions.foreach,
      breezeExtensions.visibleIf,
    ],
    context,
    utilities,
  });
}

export { breezewindRenderer as plugin, meta, renderHTML };
