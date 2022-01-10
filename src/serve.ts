import { Server } from "https://deno.land/std@0.118.0/http/server.ts";
import { cache } from "https://deno.land/x/cache@0.2.13/mod.ts";
import { relative } from "https://deno.land/std@0.118.0/path/mod.ts";
import { lookup } from "https://deno.land/x/media_types@v2.11.1/mod.ts";
import { path as _path } from "../deps.ts";
import { compileScript, compileScripts } from "../utils/compileScripts.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { trim } from "../utils/string.ts";
import { getDefinitions } from "./getDefinitions.ts";
import { renderPage } from "./renderPage.ts";
import { getWebsocketServer } from "./webSockets.ts";
import { expandRoutes } from "./expandRoutes.ts";
import { watchAll } from "./watch.ts";
import type { ServeCache } from "./watch.ts";
import type { Component, Layout, ProjectMeta, Route } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function serveGustwind(projectMeta: ProjectMeta, projectRoot: string) {
  // The cache is populated based on web socket or file system calls. If there's
  // something in the cache, then the routing logic will refer to it instead of
  // the original entries loaded from the file system.
  const cache: ServeCache = {
    contexts: {},
    components: {},
    layouts: {},
    layoutDefinitions: {},
    scripts: {},
    styles: {},
    routes: {},
    routeDefinitions: {},
  };

  const mode = "development";
  const assetsPath = projectMeta.paths.assets;
  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;

  const [routes, layouts, components] = await Promise.all([
    getJson<Record<string, Route>>(projectPaths.routes),
    getDefinitions<Layout>(projectPaths.layouts),
    getDefinitions<Component>(projectPaths.components),
  ]);
  cache.components = components;

  const wss = getWebsocketServer();

  cache.routes = await expandRoutes({
    mode,
    routes,
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
  });

  const twindSetup = projectPaths.twindSetup
    ? await import("file://" + projectPaths.twindSetup).then((m) => m.default)
    : {};

  DEBUG &&
    console.log(
      "twind setup path",
      projectPaths.twindSetup,
      "twind setup",
      twindSetup,
    );

  if (import.meta.url.startsWith("file:///")) {
    DEBUG && console.log("Compiling local scripts");

    cache.scripts = await compileScriptsToJavaScript("./scripts");
  } else {
    DEBUG && console.log("Compiling remote scripts");

    cache.scripts = Object.fromEntries(
      (await compileGustwindScripts()).map(
        ({ name, content }) => {
          return [name.replace(".ts", ".js"), content];
        },
      ),
    );
  }

  if (projectPaths.twindSetup) {
    DEBUG && console.log("Compiling project twind setup");

    const name = "twindSetup.js";

    cache.scripts[name] = (await compileScript({
      path: projectPaths.twindSetup,
      name,
      mode: "development",
    })).content;
  }
  if (projectPaths.scripts) {
    DEBUG && console.log("Compiling project scripts");

    const customScripts = await compileScriptsToJavaScript(
      projectPaths.scripts,
    );

    cache.scripts = { ...cache.scripts, ...customScripts };
  }
  if (projectPaths.transforms) {
    DEBUG && console.log("Compiling project transforms");

    const transformScripts = await compileScriptsToJavaScript(
      projectPaths.transforms,
    );

    cache.scripts = { ...cache.scripts, ...transformScripts };
  }

  watchAll({
    cache,
    wss,
    mode,
    projectRoot,
    projectPaths,
  });

  const server = new Server({
    handler: async ({ url }) => {
      const { pathname } = new URL(url);
      const matchedRoute = matchRoute(cache.routes, pathname);

      if (matchedRoute) {
        const layoutName = matchedRoute.layout;
        const matchedLayout = layouts[layoutName];

        if (matchedLayout) {
          let contentType = "text/html";

          // If there's cached data, use it instead. This fixes
          // the case in which there was an update over web socket and
          // also avoids the need to hit the file system for getting
          // the latest data.
          const layout = cache.layouts[layoutName] || matchedLayout;

          // TODO: Store context and css so that subsequent requests can find the data
          const [html, context, css] = await renderPage({
            projectMeta,
            layout,
            route: matchedRoute, // TODO: Cache?
            mode,
            pagePath: "todo", // TODO: figure out the path of the page in the system
            twindSetup,
            components: cache.components,
            pathname: url,
          });

          if (matchedRoute.type === "xml") {
            // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
            contentType = "text/xml";
          }

          cache.layoutDefinitions[url + "layout.json"] = layout;
          cache.routeDefinitions[url + "route.json"] = matchedRoute;

          if (css) {
            cache.styles[url + "styles.css"] = css;
          }

          if (context) {
            cache.contexts[url + "context.json"] = context;
          }

          return respond(200, html, contentType);
        }

        return respond(404, "No matching layout");
      }

      if (pathname === "/components.json") {
        return respond(
          200,
          JSON.stringify(cache.components),
          "application/json",
        );
      }

      const matchedCSS = cache.styles[url];

      if (matchedCSS) {
        return respond(200, matchedCSS, "text/css");
      }

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

      const assetPath = projectPaths.assets && _path.join(
        projectPaths.assets,
        relative(assetsPath || "", trim(pathname, "/")),
      );

      try {
        if (assetPath) {
          const asset = await Deno.readTextFile(assetPath);

          return respond(200, asset, lookup(assetPath));
        }
      } catch (_error) {
        // TODO: What to do with possible errors?
      }

      if (pathname.endsWith(".js")) {
        const matchedScript = cache.scripts[trim(pathname, "/")];

        if (matchedScript) {
          return respond(200, matchedScript, "text/javascript");
        }

        return respond(404, "No matching script");
      }

      return respond(404, "No matching route");
    },
  });
  const listener = Deno.listen({ port: projectMeta.port });

  return () => server.serve(listener);
}

function respond(status: number, text: string, contentType = "text/plain") {
  return new Response(text, {
    headers: { "content-type": contentType },
    status,
  });
}

function matchRoute(
  routes: Route["routes"],
  pathname: string,
): Route | undefined {
  if (!routes) {
    return;
  }

  const parts = trim(pathname, "/").split("/");
  const match = routes[pathname] || routes[parts[0]];

  if (match && match.routes && parts.length > 1) {
    return matchRoute(match.routes, parts.slice(1).join("/"));
  }

  return match;
}

async function compileGustwindScripts() {
  // TODO: Generate a list of these scripts in a dynamic way instead
  // of hardcoding. The question is how to do the lookup.
  const pageEditor = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_pageEditor.ts",
  );
  const toggleEditor = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_toggleEditor.ts",
  );
  const wsClient = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_webSocketClient.ts",
  );
  const twindRuntime = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_twindRuntime.ts",
  );

  return Promise.all([
    { name: "_pageEditor.ts", file: pageEditor },
    { name: "_toggleEditor.ts", file: toggleEditor },
    { name: "_webSocketClient.ts", file: wsClient },
    { name: "_twindRuntime.ts", file: twindRuntime },
  ].map(({ name, file: { path } }) =>
    compileScript({ name, path, mode: "development" })
  ));
}

async function compileScriptsToJavaScript(path: string) {
  try {
    return Object.fromEntries(
      (await compileScripts(path, "development")).map(
        ({ name, content }) => {
          return [name.replace(".ts", ".js"), content];
        },
      ),
    );
  } catch (error) {
    DEBUG && console.error(error);

    // If the scripts directory doesn't exist or something else goes wrong,
    // above might throw
    return {};
  }
}

if (import.meta.main) {
  const projectMeta = await getJson<ProjectMeta>("./meta.json");

  serveGustwind(projectMeta, Deno.cwd());
}

export { serveGustwind };
