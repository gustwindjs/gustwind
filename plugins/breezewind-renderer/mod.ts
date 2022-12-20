import { tw } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import type { Component } from "../../breezewind/types.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  componentsPath: string;
  metaPath: string;
  layoutsPath: string;
  pageUtilitiesPath: string;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    dependsOn: [],
  },
  init: async ({
    options: { componentsPath, metaPath, layoutsPath, pageUtilitiesPath },
    load,
    mode,
  }) => {
    const cwd = Deno.cwd();
    let [components, layouts, pageUtilities, meta] = await Promise.all([
      getDefinitions<Component>(
        await load.dir(path.join(cwd, componentsPath), ".json"),
      ),
      getDefinitions<Component>(
        await load.dir(path.join(cwd, layoutsPath), ".json"),
      ),
      pageUtilitiesPath ? load.module(path.join(cwd, pageUtilitiesPath)) : {},
      metaPath ? load.json(metaPath) : {},
    ]);

    return {
      prepareContext: async ({ url, route }) => {
        const runtimeMeta: Record<string, string> = {
          built: (new Date()).toString(),
        };

        // TODO: Rename pagePath as url across the project
        if (mode === "development") {
          runtimeMeta.pagePath = url;
        }

        const context = {
          ...runtimeMeta,
          ...meta,
          ...route.meta,
          ...route.context,
        };

        return {
          context: {
            ...context,
            pagePath: url,
            meta: await applyUtilities(
              context,
              // @ts-expect-error This is ok
              defaultUtilities,
              { context },
            ),
          },
        };
      },
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
  },
};

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

export { plugin, renderHTML };
