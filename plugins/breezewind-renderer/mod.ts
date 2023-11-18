import { path } from "../../server-deps.ts";
import breezewind from "../../breezewind/mod.ts";
import type { Component } from "../../breezewind/types.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { attachIds } from "../../utilities/attachIds.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import {
  type Components,
  initLoaders,
  type Loader,
} from "../../utilities/loaders.ts";
import {
  getComponentUtilities,
  getGlobalUtilities,
} from "../../gustwind-utilities/getUtilities.ts";
import type { GlobalUtilities, Plugin } from "../../types.ts";

const plugin: Plugin<{
  componentLoaders: { loader: Loader; path: string; selection?: string[] }[];
  globalUtilitiesPath: string;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    description:
      "${name} implements Breezewind based templating (JSON) and provides a HTML/Lisp based wrapper for bare JSON.",
    dependsOn: ["gustwind-twind-plugin", "gustwind-meta-plugin"],
  },
  init: async ({
    cwd,
    options: { componentLoaders, globalUtilitiesPath },
    load,
    mode,
  }) => {
    if (!globalUtilitiesPath) {
      throw new Error(
        "breezewind-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    const loaders = initLoaders({
      cwd,
      loadDir: load.dir,
      loadModule: (path) =>
        load.module<GlobalUtilities>({ path, type: "globalUtilities" }),
    });
    let [components, globalUtilities] = await Promise.all([
      loadComponents(),
      loadGlobalUtilities(),
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

    async function loadGlobalUtilities() {
      return globalUtilitiesPath
        ? await load.module<GlobalUtilities>({
          path: path.join(cwd, globalUtilitiesPath),
          type: "globalUtilities",
        })
        : { init: () => ({}) };
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
            localPath: globalUtilitiesPath,
            remotePath: globalUtilitiesPath,
            name: "globalUtilities.js",
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
      render: async ({ routes, route, context, url, send }) => {
        let componentsLookup = getComponents(components);
        const editorExists = await send("gustwind-editor-plugin", {
          type: "ping",
          payload: undefined,
        });

        if (editorExists) {
          // TODO: Consider caching this (html + xml separately) to speed things up
          componentsLookup = attachIdsToComponents(
            url,
            componentsLookup,
          );
        }

        return renderHTML({
          component: components[route.layout].component,
          components: componentsLookup,
          context,
          globalUtilities: getGlobalUtilities(
            globalUtilities,
            components,
            routes,
            route.layout,
          ),
          componentUtilities: getComponentUtilities(components, routes),
        });
      },
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            switch (payload.type) {
              case "components": {
                components = await loadComponents();

                return { send: [{ type: "reloadPage" }] };
              }
              case "globalUtilities": {
                globalUtilities = await loadGlobalUtilities();

                return { send: [{ type: "reloadPage" }] };
              }
              case "paths": {
                return { send: [{ type: "reloadPage" }] };
              }
            }

            // Reload anyway
            return { send: [{ type: "reloadPage" }] };
          }
          case "getComponents":
            return getComponents(components);
          case "getRenderer":
            return components[payload].component;
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

function attachIdsToComponents(
  url: string,
  components: Record<string, Component>,
): Record<string, Component> {
  return Object.fromEntries(
    Object.entries(components).map((
      [k, v],
    ) => [k, url.endsWith(".xml") ? v : attachIds(v)]),
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
