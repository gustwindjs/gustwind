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
  Tasks,
} from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-editor-plugin",
  dependsOn: ["gustwind-twind-plugin"],
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
    beforeEachRender({ url, ...rest }) {
      const outputDirectory = path.join(projectMeta.outputDirectory, url);

      pluginCache.contexts[url + "context.json"] = rest.context;
      // TODO: Do a lookup against layout data here
      //pluginCache.contexts[url + "layout.json"] = rest.route.layout;
      pluginCache.contexts[url + "route.json"] = rest.route;

      return {
        tasks: rest.route.type === "xml"
          ? []
          : ["context", "layout", "route"].map((name) => ({
            type: "writeFile",
            payload: {
              outputDirectory,
              file: `${name}.json`,
              // @ts-expect-error We know name is suitable by now
              data: JSON.stringify(rest[name]),
            },
          })),
        scripts: [
          // TODO: Check paths and path resolution
          // Note that the page editor is loaded lazily by toggleEditor.
          // Because of that it's not included to this reference list.
          { type: "module", src: "/scripts/twindRuntime.js" },
          { type: "module", src: "/scripts/toggleEditor.js" },
          { type: "module", src: "/scripts/webSocketClient.js" },
        ],
      };
    },
    prepareBuild: () => {
      const { outputDirectory } = projectMeta;

      // TODO: This should be managed by the scripts plugin!
      const scriptsDirectory = path.join(outputDirectory, "scripts");
      const tasks: Tasks = [];

      scriptsToCompile.forEach((scriptName) =>
        tasks.push({
          type: "writeScript",
          payload: {
            outputDirectory: scriptsDirectory,
            scriptName: `${scriptName}.ts`,
            // TODO: Check how to resolve the script when consuming from remote
            scriptPath: path.join(
              Deno.cwd(),
              "plugins",
              "editor",
              "scripts",
              `${scriptName}.ts`,
            ),
          },
        })
      );

      // TODO: How to get components data here to write?
      // The data is maintained by breezewind renderer so
      // the data dependency needs to be modeled somehow as well.
      /*
      tasks.push({
        type: "writeFile",
        payload: {
          outputDirectory: outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      });
      */

      return tasks;
    },
  };
}

export { editorPlugin as plugin, meta };
