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
  "webSocketClient",
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
    // TODO: How to pull layout data from renderer here?
    /*
    beforeEachMatchedRequest({ cache, route }) {
      return {
        components: Object.fromEntries(
          Object.entries(pluginCache.components).map((
            [k, v],
          ) => [k, attachIds(v)]),
        ),
        layouts: Object.fromEntries(
          Object.entries(cache.layouts).map((
            [k, v],
          ) => [k, route.type === "xml" ? v : attachIds(v)]),
        ),
      };
    },
    */
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
  };
}

export { editorPlugin as plugin, meta };
