import { cache, lookup, path as _path, Server } from "../server-deps.ts";
import { compileScript, compileScripts } from "../utils/compileScripts.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { trim } from "../utils/string.ts";
import { getDefinitions } from "./getDefinitions.ts";
import { renderPage } from "./renderPage.ts";
import { expandRoutes } from "./expandRoutes.ts";
import { getCache, type ServeCache } from "./cache.ts";
import type { Component, Layout, Mode, ProjectMeta, Route } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function serveGustwind({
  projectMeta,
  projectRoot,
  mode,
  initialCache,
}: {
  projectMeta: ProjectMeta;
  projectRoot: string;
  mode: Mode;
  initialCache?: ServeCache;
}) {
  // The cache is populated based on an external source (web socket, fs). If there's
  // something in the cache, then the routing logic will refer to it instead of
  // the original entries loaded from the file system.
  const cache = initialCache || getCache();
  const assetsPath = projectMeta.paths.assets;
  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;

  const [routes, layouts, components] = await Promise.all([
    getJson<Record<string, Route>>(projectPaths.routes),
    getDefinitions<Layout>(projectPaths.layouts),
    getDefinitions<Component>(projectPaths.components),
  ]);
  cache.components = components;

  cache.routes = await expandRoutes({
    mode,
    routes,
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
  });

  if (mode === "development") {
    if (import.meta.url.startsWith("file:///")) {
      DEBUG && console.log("Compiling local scripts");

      cache.scripts = await compileScriptsToJavaScript(
        _path.join(
          _path.dirname(_path.fromFileUrl(import.meta.url)),
          "..",
          "scripts",
        ),
      );
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

  const server = new Server({
    handler: async ({ url }) => {
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

      const { pathname } = new URL(url);
      const matchedRoute = matchRoute(cache.routes, pathname);

      if (matchedRoute) {
        const layoutName = matchedRoute.layout;

        if (!layoutName) {
          return respond(404, "No matching layout");
        }

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
            twindSetup: cache.twindSetup,
            components: cache.components,
            pageUtilities: cache.pageUtilities,
            pathname,
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

      const assetPath = projectPaths.assets && _path.join(
        projectPaths.assets,
        _path.relative(assetsPath || "", trim(pathname, "/")),
      );

      try {
        if (assetPath) {
          const asset = await Deno.readFile(assetPath);

          return respond(200, asset, lookup(assetPath));
        }
      } catch (_error) {
        // TODO: What to do with possible errors?
        DEBUG && console.error(_error);
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

function respond(
  status: number,
  text: string | Uint8Array,
  contentType = "text/plain",
) {
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

  serveGustwind({ projectMeta, projectRoot: Deno.cwd(), mode: "development" });
}

export { serveGustwind };
