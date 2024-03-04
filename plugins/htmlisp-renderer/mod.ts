import * as path from "node:path";
import breezewind from "../../breezewind/mod.ts";
import type { Component, ComponentUtilities } from "../../breezewind/types.ts";
import { applyUtilities } from "../../breezewind/applyUtility.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import { attachIds } from "../../utilities/attachIds.ts";
import { defaultUtilities } from "../../breezewind/defaultUtilities.ts";
import { initLoaders, type Loader } from "../../utilities/loaders.ts";
import {
  getComponentUtilities,
  getGlobalUtilities,
} from "../../gustwind-utilities/getUtilities.ts";
import type { Components, GlobalUtilities, Plugin } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

// TODO: Check if this can/should be simplified again now that edge renderer is a separate plugin
const plugin: Plugin<{
  componentLoaders?: { loader: Loader; path: string; selection?: string[] }[];
  componentUtilities?: ComponentUtilities;
  globalUtilitiesPath?: string;
}, {
  loaders: ReturnType<typeof initLoaders>;
  components: Components;
  globalUtilities: GlobalUtilities;
}> = {
  meta: {
    name: "htmlisp-renderer-plugin",
    description: "${name} allows rendering using HTMLisp templating language.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({
    cwd,
    options,
    load,
    mode,
  }) {
    const { componentLoaders, globalUtilitiesPath } = options;

    // TODO: Push the check to the plugin system core
    if (!globalUtilitiesPath) {
      throw new Error(
        "htmlisp-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    return {
      initPluginContext: async () => {
        const loaders = initLoaders({
          cwd,
          loadDir: load.dir,
          loadModule: (path) =>
            load.module<GlobalUtilities>({ path, type: "globalUtilities" }),
        });
        const [components, globalUtilities] = await Promise.all([
          loadComponents(loaders),
          loadGlobalUtilities(),
        ]);

        return { loaders, components, globalUtilities };
      },
      sendMessages: async ({ send, pluginContext }) => {
        const editorExists = await send("gustwind-editor-plugin", {
          type: "ping",
          payload: undefined,
        });

        if (!editorExists) {
          return;
        }

        const componentFilePath = await Deno.makeTempFile({ suffix: ".js" });
        const componentUtilitiesSource = generateComponentUtilitiesSource(
          pluginContext.components,
        );
        await Deno.writeTextFile(componentFilePath, componentUtilitiesSource);

        if (globalUtilitiesPath) {
          send("gustwind-script-plugin", {
            type: "addScripts",
            payload: [{
              isExternal: true,
              localPath: globalUtilitiesPath,
              remotePath: globalUtilitiesPath,
              name: "globalUtilities.js",
              externals: [],
            }],
          });
        }

        send("gustwind-script-plugin", {
          type: "addScripts",
          payload: [{
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
      render: async ({ routes, route, context, url, send, pluginContext }) => {
        const { components, globalUtilities } = pluginContext;
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
          componentUtilities: options.componentUtilities ||
            getComponentUtilities(components, routes),
        });
      },
      onMessage: async ({ message, pluginContext }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            DEBUG && console.log("htmlisp-renderer - file changed", payload);

            switch (payload.type) {
              case "components": {
                const components = await loadComponents(pluginContext.loaders);

                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { components },
                };
              }
              case "globalUtilities": {
                const globalUtilities = await loadGlobalUtilities();

                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { globalUtilities },
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

    async function loadComponents(
      loaders: ReturnType<typeof initLoaders>,
    ): Promise<Components> {
      const components = componentLoaders
        ? await Promise.all(
          componentLoaders.map(
            ({ loader, path: componentsPath, selection }) => {
              const matchedLoader = loaders[loader];

              if (!matchedLoader) {
                throw new Error(
                  `No loader named ${loader} found amongst ${
                    Object.keys(loaders)
                  }`,
                );
              }

              return matchedLoader(componentsPath, selection);
            },
          ),
        )
        : {};

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
