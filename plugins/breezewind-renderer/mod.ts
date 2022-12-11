import { tw } from "../../client-deps.ts";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { Component } from "../../breezewind/types.ts";
import type { Plugin, PluginMeta } from "../../types.ts";

const meta: PluginMeta = {
  name: "breezewind-renderer-plugin",
  dependsOn: [],
};

async function breezewindRenderer(
  { componentsPath, layoutsPath, pageUtilitiesPath }: {
    componentsPath: string;
    layoutsPath: string;
    pageUtilitiesPath: string;
  },
): Promise<Plugin> {
  const cwd = Deno.cwd();

  // TODO: Use this for cache busting modules in watch mode
  // "?cache=" +
  // new Date().getTime()
  //
  // Maybe it's a good default for an import helper
  const [components, layouts, pageUtilities] = await Promise.all([
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
    onMessage: ({ type, payload }: { type: string; payload: string }) => {
      if (type === "get-components") {
        return components;
      }
      if (type === "get-renderer") {
        return layouts[payload];
      } else {
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
