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
import {
  getComponentUtilities,
  getGlobalUtilities,
} from "../../utilities/getPageUtilities.ts";
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
      sendMessages: async ({ send }) => {
        const componentFilePath = await Deno.makeTempFile({ suffix: ".js" });
        const componentUtilitiesSource = generateComponentUtilitiesSource(
          components,
        );
        await Deno.writeTextFile(componentFilePath, componentUtilitiesSource);

        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: [{
            isExternal: true,
            localPath: pageUtilitiesPath,
            remotePath: pageUtilitiesPath,
            name: "pageUtilities.js",
            externals: [],
          }, {
            isExternal: true,
            localPath: componentFilePath,
            remotePath: componentFilePath,
            name: "componentUtilities.js",
            externals: [],
          }],
        });
      },
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
          globalUtilities: getGlobalUtilities(
            pageUtilities,
            components,
            routes,
            route.layout,
          ),
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
      breezeExtensions.foreach,
    ],
    context,
    globalUtilities,
    componentUtilities,
  });
}

export { plugin, renderHTML };
