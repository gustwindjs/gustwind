import { attachIds } from "../utilities/attachIds.ts";
import { dir } from "../utilities/fs.ts";
import { fs, path } from "../server-deps.ts";
import {
  Components,
  Context,
  DataContext,
  Layout,
  ProjectMeta,
  Route,
} from "../types.ts";
import { createWorkerPool } from "../gustwind-builder/createWorkerPool.ts";
import { type ServeCache } from "../gustwind-server/cache.ts";
import { respond as respondUtility } from "../gustwind-utilities/respond.ts";

const pluginName = "gustwind-editor-plugin";
const dependsOn = ["gustwind-twind-plugin"];
const scriptsToCompile = [
  "pageEditor",
  "toggleEditor",
  "twindRuntime",
  "webSocketClient",
].map((n) => `${pluginName}/${n}.ts`);

type EditorCache = {
  contexts: Record<string, DataContext>;
  layoutDefinitions: Record<string, Layout>;
  routeDefinitions: Record<string, Route>;
};

function editorPlugin(
  projectMeta: ProjectMeta,
  // setup: Record<string, unknown>,
) {
  return {
    setupCache(): EditorCache {
      return {
        contexts: {},
        layoutDefinitions: {},
        routeDefinitions: {},
      };
    },
    beforeEachRequest(
      { cache, url, respond }: {
        cache: ServeCache & EditorCache;
        url: string;
        respond: typeof respondUtility;
      },
    ) {
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
    beforeEachMatchedRequest(
      { cache, route }: { cache: ServeCache; route: Route },
    ) {
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
    beforeEachRender() {
      // TODO: Add tasks per route if route.type !== "xml" and we're in building mode
      /*
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "context.json"),
        JSON.stringify(context),
      );
      await Deno.writeTextFile(
        path.join(dir, "layout.json"),
        JSON.stringify(layout),
      );
      await Deno.writeTextFile(
        path.join(dir, "route.json"),
        JSON.stringify(route),
      );
      */

      return {
        scripts: [
          // TODO: Check paths and path resolution
          { type: "module", src: "/gustwind-editor-plugin/twindRuntime.js" },
          { type: "module", src: "/gustwind-editor-plugin/toggleRuntime.js" },
          { type: "module", src: "/gustwind-editor-plugin/webSocketClient.js" },
        ],
      };
    },
    afterEachRender(
      {
        cache,
        markup,
        layout,
        context,
        route,
        url,
      }: {
        cache: ServeCache & EditorCache;
        markup: string;
        layout: Layout;
        context: Context;
        route: Route;
        url: string;
      },
    ) {
      return {
        markup,
        // TODO: Inject targets to the cache for each url
        cache: {
          ...cache,
          contexts: {
            ...cache.contexts,
            [url + "context.json"]: context,
          },
          layoutDefinitions: {
            ...cache.layoutDefinitions,
            [url + "layout.json"]: layout,
          },
          routeDefinitions: {
            ...cache.routeDefinitions,
            [url + "route.json"]: route,
          },
        },
      };
    },
    prepareBuild: async (
      { workerPool, components }: {
        workerPool: ReturnType<typeof createWorkerPool>;
        components: Components;
      },
    ) => {
      const { paths } = projectMeta;
      const outputDirectory = paths.output;
      const transformDirectory = path.join(outputDirectory, "transforms");
      await fs.ensureDir(transformDirectory);

      const transformScripts = await dir(paths.transforms, ".ts");
      transformScripts.forEach(({ name: scriptName, path: scriptPath }) =>
        workerPool.addTaskToQueue({
          type: "writeScript",
          payload: {
            outputDirectory: transformDirectory,
            scriptName,
            scriptPath,
          },
        })
      );

      workerPool.addTaskToQueue({
        type: "writeFile",
        payload: {
          dir: outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      });
    },
  };
}

export { dependsOn, editorPlugin as plugin, scriptsToCompile };
