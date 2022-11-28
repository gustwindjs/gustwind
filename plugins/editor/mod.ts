import { attachIds } from "../../utilities/attachIds.ts";
import { dir } from "../../utilities/fs.ts";
import { fs, path } from "../../server-deps.ts";
import type { Component } from "../../breezewind/types.ts";
import {
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
// TODO: Allow defining where to emit the scripts
function editorPlugin(projectMeta: ProjectMeta): Plugin {
  const pluginCache: PluginCache = {
    components: {},
    contexts: {},
    layoutDefinitions: {},
    routeDefinitions: {},
  };

  return {
    beforeEachRequest({ cache, url, respond }) {
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
    beforeEachRender({ url, ...rest }) {
      const { paths } = projectMeta;
      const outputDirectory = path.join(paths.output, url);

      pluginCache.contexts[url + "context.json"] = rest.context;
      pluginCache.contexts[url + "layout.json"] = rest.layout;
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
          { type: "module", src: "/scripts/twindRuntime.js" },
          { type: "module", src: "/scripts/toggleEditor.js" },
          { type: "module", src: "/scripts/webSocketClient.js" },
        ],
      };
    },
    prepareBuild: async ({ components }) => {
      const { paths } = projectMeta;
      const outputDirectory = paths.output;
      // TODO: Check this
      const transformDirectory = path.join(outputDirectory, "transforms");
      // TODO: Check this
      const scriptsDirectory = path.join(outputDirectory, "scripts");
      await fs.ensureDir(transformDirectory);
      const tasks: Tasks = [];

      const transformScripts = await dir(paths.transforms, ".ts");
      transformScripts.forEach(({ name: scriptName, path: scriptPath }) =>
        tasks.push({
          type: "writeScript",
          payload: {
            outputDirectory: transformDirectory,
            scriptName,
            scriptPath,
          },
        })
      );

      scriptsToCompile.forEach((scriptName) =>
        tasks.push({
          type: "writeScript",
          payload: {
            outputDirectory: scriptsDirectory,
            scriptName,
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

      tasks.push({
        type: "writeFile",
        payload: {
          outputDirectory: outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      });

      return tasks;
    },
  };
}

export { editorPlugin as plugin, meta };
