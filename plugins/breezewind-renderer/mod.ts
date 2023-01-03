import { tw } from "https://esm.sh/@twind/core@1.1.1";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import type { Component, Utilities } from "../../breezewind/types.ts";
import type { Plugin, Routes } from "../../types.ts";

type PageUtilities = {
  init: ({ routes }: { routes: Routes }) => Utilities;
};

// TODO: If a component changes, reload the file (needs handling here somehow)
// TODO: If a layout changes, reload the file (needs handling here somehow)
// TODO: Check if changing page utilities and meta work as well
// One solution would be to read the data on demand instead of trying to
// maintain it here.
const plugin: Plugin<{
  componentsPath: string;
  metaPath: string;
  layoutsPath: string;
  pageUtilitiesPath: string;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    dependsOn: ["gustwind-twind-plugin"],
  },
  init: async ({
    cwd,
    options: { componentsPath, metaPath, layoutsPath, pageUtilitiesPath },
    load,
    mode,
  }) => {
    let [components, layouts, pageUtilities, meta] = await Promise.all([
      loadComponents(),
      loadLayouts(),
      loadPageUtilities(),
      loadMeta(),
    ]);

    async function loadComponents() {
      return getDefinitions<Component>(
        await load.dir({
          path: path.join(cwd, componentsPath),
          extension: ".json",
          recursive: true,
          type: "components",
        }),
      );
    }

    async function loadLayouts() {
      return getDefinitions<Component>(
        await load.dir({
          path: path.join(cwd, layoutsPath),
          extension: ".json",
          recursive: true,
          type: "layouts",
        }),
      );
    }

    async function loadPageUtilities() {
      return pageUtilitiesPath
        ? await load.module<PageUtilities>({
          path: path.join(cwd, pageUtilitiesPath),
          type: "pageUtilities",
        })
        : undefined;
    }

    function loadMeta() {
      return metaPath ? load.json({ path: metaPath, type: "meta" }) : {};
    }

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
      beforeEachRender({ route }) {
        return layouts[route.layout]
          ? [{
            type: "watchPaths",
            payload: {
              paths: [path.join(cwd, layoutsPath, route.layout + ".json")],
            },
          }]
          : [];
      },
      render: ({ routes, route, context }) =>
        renderHTML({
          component: layouts[route.layout],
          components,
          context,
          utilities: pageUtilities && pageUtilities.init({ routes }),
        }),
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            switch (payload.type) {
              case "components": {
                components = await loadComponents();

                return { send: [{ type: "reloadPage" }] };
              }
              case "layouts": {
                layouts = await loadLayouts();

                return { send: [{ type: "reloadPage" }] };
              }
              case "pageUtilities": {
                pageUtilities = await loadPageUtilities();

                return { send: [{ type: "reloadPage" }] };
              }
              case "meta": {
                meta = await loadMeta();

                return { send: [{ type: "reloadPage" }] };
              }
            }
            return;
          }
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
      // It's important visibleIf evaluates before the others to avoid work
      breezeExtensions.visibleIf,
      // TODO: Allow defining these through configuration
      breezeExtensions.classShortcut(tw),
      breezeExtensions.foreach,
    ],
    context,
    utilities,
  });
}

export { plugin, renderHTML };
