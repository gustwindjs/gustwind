import { tw } from "../../client-deps.ts";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { Component } from "../../breezewind/types.ts";
import type { PluginApi, PluginMeta, PluginParameters } from "../../types.ts";

const meta: PluginMeta = {
  name: "breezewind-renderer-plugin",
  dependsOn: [],
};

async function breezewindRenderer(
  { options: { componentsPath, layoutsPath, pageUtilitiesPath }, load }:
    PluginParameters<
      {
        componentsPath: string;
        layoutsPath: string;
        pageUtilitiesPath: string;
      }
    >,
): Promise<PluginApi> {
  const cwd = Deno.cwd();
  let [components, layouts, pageUtilities] = await Promise.all([
    getDefinitions<Component>(
      await load.dir(path.join(cwd, componentsPath), ".json"),
    ),
    getDefinitions<Component>(
      await load.dir(path.join(cwd, layoutsPath), ".json"),
    ),
    pageUtilitiesPath ? load.module(path.join(cwd, pageUtilitiesPath)) : {},
  ]);

  return {
    render: ({ route, context }) =>
      renderHTML({
        component: layouts[route.layout],
        components,
        context,
        utilities: pageUtilities,
      }),
    onMessage: ({ type, payload }) => {
      switch (type) {
        case "getComponents":
          return components;
        case "getLayouts":
          return layouts;
        case "getRenderer":
          return layouts[payload];
        case "updateComponents":
          // @ts-expect-error This is fine.
          components = payload;
          break;
        case "updateLayouts":
          // @ts-expect-error This is fine.
          layouts = payload;
          break;
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
