import { compileTypeScript } from "../utils/compileTypeScript.ts";
import { watch } from "../utils/fs.ts";
import { path as _path } from "../deps.ts";
import { getDefinition } from "./getDefinitions.ts";
import { expandRoute } from "./expandRoutes.ts";
import { getWebsocketServer } from "./webSockets.ts";
import type { Component, Layout, Mode, ProjectMeta, Route } from "../types.ts";

function watchDataSourceInputs(
  { wss, path, routesCache, mode, dataSourcesPath, transformsPath }: {
    wss: ReturnType<typeof getWebsocketServer>;
    path: string;
    routesCache: ServeCache["routes"];
    mode: Mode;
    dataSourcesPath: ProjectMeta["paths"]["dataSources"];
    transformsPath: ProjectMeta["paths"]["transforms"];
  },
) {
  const watched = new Set();

  Object.values(routesCache).forEach((route) => {
    const { dataSources, url } = route;

    dataSources?.forEach(({ input }) => {
      if (!watched.has(input)) {
        watch(_path.join(path, input), "", async (matchedPath) => {
          console.log("Changed data source input", matchedPath, url);

          const [u, r] = await expandRoute({
            url: url as string,
            route,
            mode,
            dataSourcesPath,
            transformsPath,
          });
          routesCache[u] = r;

          wss.clients.forEach((socket) => {
            socket.send(JSON.stringify({ type: "reloadPage" }));
          });
        });
        watched.add(input);
      }
    });
  });
}

function watchMeta(
  wss: ReturnType<typeof getWebsocketServer>,
  path?: string,
) {
  path && watch(path, "meta.json", (matchedPath) => {
    console.log("Changed meta", matchedPath);
    wss.clients.forEach((socket) => {
      // TODO: Update meta cache
      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchComponents(
  components: Record<string, Component>,
  wss: ReturnType<typeof getWebsocketServer>,
  path?: string,
) {
  path && watch(path, ".json", (matchedPath) => {
    console.log("Changed component", matchedPath);

    wss.clients.forEach(async (socket) => {
      const [componentName, componentDefinition] = await getDefinition<
        Component
      >(
        matchedPath,
      );

      if (componentName && componentDefinition) {
        components[componentName] = componentDefinition;
      }

      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchDataSources(
  wss: ReturnType<typeof getWebsocketServer>,
  path?: string,
) {
  path && watch(path, ".json", (matchedPath) => {
    console.log("Changed data sources", matchedPath);
    wss.clients.forEach((socket) => {
      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchRoutes(
  wss: ReturnType<typeof getWebsocketServer>,
  path?: string,
) {
  path && watch(path, ".json", (matchedPath) => {
    console.log("Changed routes", matchedPath);
    wss.clients.forEach((socket) => {
      // TODO: Update route cache (needs change above as well in the catch-all route)
      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchLayouts(
  wss: ReturnType<typeof getWebsocketServer>,
  layoutsCache: ServeCache["layouts"],
  path?: string,
) {
  path && watch(path, ".json", (matchedPath) => {
    console.log("Changed layouts", matchedPath);
    wss.clients.forEach(async (socket) => {
      const [layoutName, layoutDefinition] = await getDefinition<Layout>(
        matchedPath,
      );

      if (layoutName && layoutDefinition) {
        layoutsCache[layoutName] = layoutDefinition;
      }

      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchTransforms(
  wss: ReturnType<typeof getWebsocketServer>,
  path?: string,
) {
  path && watch(path, ".ts", (matchedPath) => {
    console.log("Changed transforms", matchedPath);
    wss.clients.forEach((socket) => {
      // TODO: Update transform cache? Since these go through
      // import(), likely tracking timestamps of updates would be enough
      // as then those could be used for invalidation
      socket.send(JSON.stringify({ type: "reloadPage" }));
    });
  });
}

function watchScripts(
  wss: ReturnType<typeof getWebsocketServer>,
  scriptsCache: ServeCache["scripts"],
  path?: string,
) {
  path &&
    watch(path, ".ts", async (matchedPath) => {
      const scriptName = _path.basename(
        matchedPath,
        _path.extname(matchedPath),
      );

      console.log("Changed script", matchedPath);

      scriptsCache[scriptName + ".ts"] = await compileTypeScript(
        matchedPath,
        "development",
      );

      wss.clients.forEach((socket) => {
        // 1 for open, https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
        if (socket.state === 1) {
          socket.send(
            JSON.stringify({
              type: "replaceScript",
              payload: { name: "/" + scriptName + ".js" },
            }),
          );
        }
      });
    });
}

function watchAll(
  { wss, cache, mode, projectRoot, projectPaths, components }: {
    wss: ReturnType<typeof getWebsocketServer>;
    cache: ServeCache;
    mode: Mode;
    projectRoot: string;
    projectPaths: ProjectMeta["paths"];
    components: Record<string, Component>;
  },
) {
  watchDataSourceInputs({
    wss,
    path: projectRoot,
    routesCache: cache.routes,
    mode,
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
  });
  watchScripts(wss, cache.scripts, projectPaths.scripts);
  watchMeta(wss, projectRoot);
  watchComponents(components, wss, projectPaths.routes);
  watchDataSources(wss, projectPaths.routes);
  watchRoutes(wss, projectPaths.routes);
  watchLayouts(wss, cache.layouts, projectPaths.layouts);
  watchTransforms(wss, projectPaths.transforms);
}

type ServeCache = {
  layouts: Record<string, Layout>;
  scripts: Record<string, string>;
  routes: Record<string, Route>;
};

export type { ServeCache };

export {
  watchAll,
  watchComponents,
  watchDataSourceInputs,
  watchDataSources,
  watchLayouts,
  watchMeta,
  watchRoutes,
  watchScripts,
  watchTransforms,
};
