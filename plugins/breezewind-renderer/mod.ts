import { tw } from "https://esm.sh/@twind/core@1.1.1";
import { path } from "../../server-deps.ts";
import breezewind from "../../breezewind/mod.ts";
import type { Component } from "../../breezewind/types.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import {
  type Components,
  initLoaders,
  type Loader,
} from "../../utilities/loaders.ts";
import { getComponentUtilities } from "../../utilities/getComponentUtilities.ts";
import type { PageUtilities, Plugin } from "../../types.ts";

const plugin: Plugin<{
  componentLoaders: { loader: Loader; path: string; selection?: string[] }[];
  metaPath: string;
  pageUtilitiesPath: string;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    dependsOn: ["gustwind-twind-plugin"],
  },
  init: async ({
    cwd,
    options: { componentLoaders, metaPath, pageUtilitiesPath },
    load,
    mode,
  }) => {
    const loaders = initLoaders({
      cwd,
      loadDir: load.dir,
      loadModule: (path) =>
        load.module<PageUtilities>({ path, type: "pageUtilities" }),
    });
    let [components, pageUtilities, meta] = await Promise.all([
      loadComponents(),
      loadPageUtilities(),
      loadMeta(),
    ]);

    async function loadComponents(): Promise<Components> {
      // Collect components from different directories
      const components = await Promise.all(
        componentLoaders.map(({ loader, path: componentsPath, selection }) => {
          const matchedLoader = loaders[loader];

          if (!matchedLoader) {
            throw new Error(
              `No loader named ${loader} found amongst ${Object.keys(loaders)}`,
            );
          }

          return matchedLoader(componentsPath, selection);
        }),
      );

      // Aggregate components together as a single collection
      // @ts-expect-error This is fine since we either fail or aggregate matches
      return Object.assign.apply(undefined, components);
    }

    async function loadPageUtilities() {
      return pageUtilitiesPath
        ? await load.module<PageUtilities>({
          path: path.join(cwd, pageUtilitiesPath),
          type: "pageUtilities",
        })
        : { init: () => ({}) };
    }

    function loadMeta() {
      return metaPath ? load.json({ path: metaPath, type: "meta" }) : {};
    }

    return {
      prepareContext: async ({ url, route }) => {
        const runtimeMeta: Record<string, string> = {
          built: (new Date()).toString(),
        };

        // TODO: Rename pagePath as url across the project?
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
      render: ({ routes, route, context }) =>
        renderHTML({
          component: components[route.layout].component,
          components: getComponents(components),
          context,
          globalUtilities: pageUtilities.init({ routes }),
          componentUtilities: getComponentUtilities(components, routes),
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
              case "pageUtilities": {
                pageUtilities = await loadPageUtilities();

                return { send: [{ type: "reloadPage" }] };
              }
              case "meta": {
                meta = loadMeta();

                return { send: [{ type: "reloadPage" }] };
              }
              case "paths": {
                return { send: [{ type: "reloadPage" }] };
              }
            }
            return;
          }
          case "getComponents":
            return getComponents(components);
          case "getRenderer":
            return components[payload].component;
          case "updateComponents":
            components = updateComponents(components, payload);
            break;
        }
      },
    };
  },
};

function getComponents(
  components: Components,
): Record<string, Component> {
  return Object.fromEntries(
    Object.entries(components).map(([k, v]) => [k, v.component]),
  );
}

function updateComponents(
  components: Components,
  update: Record<string, Component>,
): Components {
  return Object.fromEntries(
    Object.entries(components).map((
      [k, v],
    ) => [k, { ...v, component: update[k] }]),
  );
}

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
      // TODO: Allow defining these through configuration
      breezeExtensions.classShortcut(tw),
      breezeExtensions.foreach,
    ],
    context,
    globalUtilities,
    componentUtilities,
  });
}

export { plugin, renderHTML };
