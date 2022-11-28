import { attachIds } from "../../utilities/attachIds.ts";
import { dir } from "../../utilities/fs.ts";
import { fs, path } from "../../server-deps.ts";
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
  scriptsToCompile: [
    "pageEditor",
    "toggleEditor",
    "twindRuntime",
    "webSocketClient",
  ].map((n) => `${n}.ts`),
};

type EditorCache = {
  contexts: Record<string, DataContext>;
  layoutDefinitions: Record<string, Layout>;
  routeDefinitions: Record<string, Route>;
};

function editorPlugin(projectMeta: ProjectMeta): Plugin<EditorCache> {
  return {
    setupCache(): EditorCache {
      return {
        contexts: {},
        layoutDefinitions: {},
        routeDefinitions: {},
      };
    },
    beforeEachRequest({ cache, url, respond }) {
      const matchedContext = cache.contexts[url];

      if (matchedContext) {
        return respond(200, JSON.stringify(matchedContext), "application/json");
      }

      const matchedLayoutDefinition = cache.layoutDefinitions[url];

      if (matchedLayoutDefinition) {
        return respond(
          200,
          JSON.stringify(matchedLayoutDefinition),
          "application/json",
        );
      }

      const matchedRouteDefinition = cache.routeDefinitions[url];

      if (matchedRouteDefinition) {
        return respond(
          200,
          JSON.stringify(matchedRouteDefinition),
          "application/json",
        );
      }
    },
    beforeEachMatchedRequest({ cache, route }) {
      return {
        ...cache,
        components: Object.fromEntries(
          Object.entries(cache.components).map(([k, v]) => [k, attachIds(v)]),
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

      return {
        // TODO: Likely cache and tasks will converge into a single
        // definition depending on server/build.
        cache: {
          contexts: {
            [url + "context.json"]: rest.context,
          },
          layoutDefinitions: {
            [url + "layout.json"]: rest.layout,
          },
          routeDefinitions: {
            [url + "route.json"]: rest.route,
          },
        },
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
          { type: "module", src: "/gustwind-editor-plugin/twindRuntime.js" },
          { type: "module", src: "/gustwind-editor-plugin/toggleRuntime.js" },
          { type: "module", src: "/gustwind-editor-plugin/webSocketClient.js" },
        ],
      };
    },
    prepareBuild: async ({ components }) => {
      const { paths } = projectMeta;
      const outputDirectory = paths.output;
      const transformDirectory = path.join(outputDirectory, "transforms");
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
