import { attachIds } from "../../utilities/attachIds.ts";
// import { dir } from "../../utilities/fs.ts";
import { path } from "../../server-deps.ts";
import type { Component } from "../../breezewind/types.ts";
import type {
  DataContext,
  Layout,
  Plugin,
  PluginMeta,
  ProjectMeta,
  Route,
} from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-editor-plugin",
  dependsOn: [
    "breezewind-renderer-plugin",
    "gustwind-twind-plugin",
    "gustwind-script-plugin",
  ],
};

const scriptsToCompile = [
  "pageEditor",
  "toggleEditor",
  "twindRuntime",
  // TODO: Re-enable
  // "webSocketClient",
];

type PluginCache = {
  components: Record<string, Component>;
  contexts: Record<string, DataContext>;
  layoutDefinitions: Record<string, Layout>;
  routeDefinitions: Record<string, Route>;
};

// TODO: Figure out how to integrate with the watcher
function editorPlugin(_: never, projectMeta: ProjectMeta): Plugin {
  const pluginCache: PluginCache = {
    components: {},
    contexts: {},
    layoutDefinitions: {},
    routeDefinitions: {},
  };

  return {
    // TODO: Redo this one (reconsider respond method)
    beforeEachRequest({ url, respond }) {
      const matchedContext = pluginCache.contexts[url];

      if (matchedContext) {
        return respond(200, JSON.stringify(matchedContext), "application/json");
      }

      const matchedLayoutDefinition = pluginCache.layoutDefinitions[url];

      if (matchedLayoutDefinition) {
        return respond(
          200,
          JSON.stringify(matchedLayoutDefinition),
          "application/json",
        );
      }

      const matchedRouteDefinition = pluginCache.routeDefinitions[url];

      if (matchedRouteDefinition) {
        return respond(
          200,
          JSON.stringify(matchedRouteDefinition),
          "application/json",
        );
      }

      if (url === "/components.json") {
        return respond(
          200,
          JSON.stringify(pluginCache.components),
          "application/json",
        );
      }
    },
    beforeEachRender({ url, send, route, context }) {
      const outputDirectory = path.join(projectMeta.outputDirectory, url);

      const lookup = {
        context,
        layout: send(
          "breezewind-renderer-plugin",
          { type: "get-renderer", payload: route.layout },
        ),
        route,
      };

      // TODO: Consider eliminating pluginCache and deriving instead
      pluginCache.contexts[url + "context.json"] = context;
      // @ts-expect-error Assume this is fine or crashes the runtime
      pluginCache.contexts[url + "layout.json"] = lookup.layout;
      pluginCache.contexts[url + "route.json"] = route;

      return route.type === "xml"
        ? []
        : ["context", "layout", "route"].map((name) => ({
          type: "writeFile",
          payload: {
            outputDirectory,
            file: `${name}.json`,
            // @ts-expect-error We know name is suitable by now
            data: JSON.stringify(lookup[name]),
          },
        }));
    },
    sendMessages: ({ send }) => {
      const cwd = Deno.cwd();

      send("gustwind-script-plugin", {
        type: "add-scripts",
        payload: scriptsToCompile.map((name) => ({
          // TODO: How to make this work in the remote case?
          path: path.join(cwd, "plugins", "editor", "scripts", `${name}.ts`),
          name: `${name}.ts`,
        })),
      });
    },
    prepareBuild: async ({ send }) => {
      const components = await send("breezewind-renderer-plugin", {
        type: "get-components",
      });

      return [{
        type: "writeFile",
        payload: {
          outputDirectory: projectMeta.outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      }];
    },
    prepareContext: async ({ route, send }) => {
      const id = "breezewind-renderer-plugin";

      const components = await send(id, {
        type: "get-components",
      });
      send(id, {
        type: "update-components",
        payload: Object.fromEntries(
          // @ts-expect-error This is fine.
          Object.entries(components).map((
            [k, v],
            // @ts-expect-error This is fine.
          ) => [k, attachIds(v)]),
        ),
      });

      const layouts = await send(id, {
        type: "get-layouts",
      });
      send(id, {
        type: "update-layouts",
        payload: Object.fromEntries(
          // @ts-expect-error This is fine.
          Object.entries(layouts).map((
            [k, v],
            // @ts-expect-error This is fine.
          ) => [k, route.type === "xml" ? v : attachIds(v)]),
        ),
      });
    },
  };
}

export { editorPlugin as plugin, meta };
