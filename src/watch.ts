import { compileTypeScript } from "../utils/compileTypeScript.ts";
import { watch } from "../utils/fs.ts";
import { path as _path } from "../deps.ts";
import { getDefinition } from "./getDefinitions.ts";
import { expandRoute } from "./expandRoutes.ts";
import { getWebsocketServer } from "./webSockets.ts";
import type { Component, Layout, Mode, ProjectMeta } from "../types.ts";
import type { ServeCache } from "./cache.ts";

function watchDataSourceInputs(
  { wss, path, cache, mode, dataSourcesPath, transformsPath }: {
    wss: ReturnType<typeof getWebsocketServer>;
    path: string;
    cache: ServeCache;
    mode: Mode;
    dataSourcesPath: ProjectMeta["paths"]["dataSources"];
    transformsPath: ProjectMeta["paths"]["transforms"];
  },
) {
  const watched = new Set();

  Object.values(cache.routes).forEach((route) => {
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
          cache.routes[u] = r;

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
  wss: ReturnType<typeof getWebsocketServer>,
  cache: ServeCache,
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
        console.log("Updating component", componentName, componentDefinition);

        cache.components[componentName] = componentDefinition;
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
  cache: ServeCache,
  path?: string,
) {
  path && watch(path, ".json", (matchedPath) => {
    console.log("Changed layouts", matchedPath);
    wss.clients.forEach(async (socket) => {
      const [layoutName, layoutDefinition] = await getDefinition<Layout>(
        matchedPath,
      );

      if (layoutName && layoutDefinition) {
        cache.layouts[layoutName] = layoutDefinition;
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

// TODO: This should get imports from each script and watch them as well
function watchScripts(
  wss: ReturnType<typeof getWebsocketServer>,
  cache: ServeCache,
  path?: string,
) {
  path &&
    watch(path, ".ts", async (matchedPath) => {
      const scriptName = _path.basename(
        matchedPath,
        _path.extname(matchedPath),
      );

      console.log("Changed script", matchedPath);

      cache.scripts[scriptName + ".ts"] = await compileTypeScript(
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
  { cache, mode, projectRoot, projectPaths }: {
    cache: ServeCache;
    mode: Mode;
    projectRoot: string;
    projectPaths: ProjectMeta["paths"];
  },
) {
  const wss = getWebsocketServer();

  watchDataSourceInputs({
    wss,
    path: projectRoot,
    cache,
    mode,
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
  });
  watchScripts(wss, cache, projectPaths.scripts);
  watchMeta(wss, projectRoot);
  watchComponents(wss, cache, projectPaths.components);
  watchDataSources(wss, projectPaths.dataSources);
  watchRoutes(wss, projectPaths.routes);
  watchLayouts(wss, cache, projectPaths.layouts);
  watchTransforms(wss, projectPaths.transforms);
}

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
