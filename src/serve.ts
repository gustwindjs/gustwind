import { Server } from "https://deno.land/std@0.118.0/http/server.ts";
import { cache } from "https://deno.land/x/cache@0.2.13/mod.ts";
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
    components: {},
    layouts: {},
    scripts: {},
    routes: {},
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

  // TODO: This could happen later on demand to speed up startup
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

  /*
  assetsPath && app.use(cleanAssetsPath(assetsPath), serveStatic(assetsPath));

  app.get(
    "/components.json",
    (_req, res) => res.json(cache.components),
  );

  // Use a custom router to capture dynamically generated routes. Otherwise
  // newly added routes would be after the catch-all route in the system
  // and the router would never get to them.
  const dynamicRouter = Router();
  app.use(dynamicRouter);
  app.use(async ({ url }, res) => {
    const matchedRoute = matchRoute(cache.routes, url);

    if (matchedRoute) {
      const layoutName = matchedRoute.layout;
      const matchedLayout = layouts[layoutName];

      if (matchedLayout) {
        // If there's cached data, use it instead. This fixes
        // the case in which there was an update over web socket and
        // also avoids the need to hit the file system for getting
        // the latest data.
        const layout = cache.layouts[layoutName] || matchedLayout;
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
          res.set("Content-Type", "text/xml");
        }

        await dynamicRouter.get(
          url + "layout.json",
          (_req, res) => res.json(layout),
        );

        await dynamicRouter.get(
          url + "route.json",
          (_req, res) => res.json(matchedRoute),
        );

        if (context) {
          await dynamicRouter.get(
            url + "context.json",
            (_req, res) => res.json(context),
          );
        }

        if (css) {
          await dynamicRouter.get(
            url + "styles.css",
            (_req, res) => res.send(css),
          );
        }

        res.send(html);

        return;
      }

      res.send("no matching layout");
    }

    res.send("no matching route");
  });
  */

  let scripts: Record<string, string>;
  if (import.meta.url.startsWith("file:///")) {
    DEBUG && console.log("Compiling local scripts");

    scripts = Object.fromEntries(
      (await compileScripts("./scripts", "development")).map(
        ({ name, content }) => {
          return [name.replace(".ts", ".js"), content];
        },
      ),
    );
  } else {
    DEBUG && console.log("Compiling remote scripts");

    scripts = Object.fromEntries(
      (await compileGustwindScripts()).map(
        ({ name, content }) => {
          return [name.replace(".ts", ".js"), content];
        },
      ),
    );
  }

  if (projectPaths.twindSetup) {
    const name = "twindSetup.js";

    scripts[name] = (await compileScript({
      path: projectPaths.twindSetup,
      name,
      mode: "development",
    })).content;
  }

  // TODO: Restore
  /*
  await serveScripts({
    router: app,
    scriptsCache: cache.scripts,
    scriptsPath: projectPaths.scripts,
  });
  await serveScripts({
    router: app,
    scriptsCache: cache.scripts,
    scriptsPath: projectPaths.transforms,
    prefix: "transforms/",
  });
  */

  watchAll({
    cache,
    wss,
    mode,
    projectRoot,
    projectPaths,
  });

  // TODO: Handle static assets - https://deno.com/deploy/docs/serve-static-assets
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

          return new Response(html, {
            headers: { "content-type": contentType },
          });
        }

        return new Response("No matching layout", {
          headers: { "content-type": "text/plain" },
        });
      }

      if (pathname.endsWith(".js")) {
        const matchedScript = scripts[trim(pathname, "/")];

        if (matchedScript) {
          return new Response(matchedScript, {
            headers: { "content-type": "text/javascript" },
          });
        }

        return new Response("No matching script", {
          headers: { "content-type": "text/plain" },
        });
      }

      return new Response("No matching route", {
        headers: { "content-type": "text/plain" },
      });
    },
  });
  const listener = Deno.listen({ port: projectMeta.port });

  return () => server.serve(listener);
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

/*
function cleanAssetsPath(p: string) {
  return "/" + p.split("/").slice(1).join("/");
}

async function serveScripts(
  { router, scriptsCache, scriptsPath, prefix = "" }: {
    router: ReturnType<typeof opine>;
    scriptsCache: ServeCache["scripts"];
    scriptsPath?: string;
    prefix?: string;
  },
) {
  if (!scriptsPath) {
    return;
  }

  try {
    const scriptsWithFiles = await compileScripts(scriptsPath, "development");

    routeScripts({ router, scriptsCache, scriptsWithFiles, prefix });
  } catch (error) {
    console.error(error);
  }
}

async function serveScript({ router, scriptsCache, scriptName, scriptPath }: {
  router: ReturnType<typeof opine>;
  scriptsCache: ServeCache["scripts"];
  scriptName: string;
  scriptPath?: string;
}) {
  if (!scriptPath) {
    return;
  }

  try {
    const script = await compileScript({
      path: scriptPath,
      name: "",
      mode: "development",
    });
    script.name = scriptName;

    routeScripts({ router, scriptsCache, scriptsWithFiles: [script] });
  } catch (error) {
    console.error(error);
  }
}

function routeScripts({ router, scriptsCache, scriptsWithFiles, prefix = "" }: {
  router: ReturnType<typeof opine>;
  scriptsCache: ServeCache["scripts"];
  scriptsWithFiles: { path: string; name: string; content: string }[];
  prefix?: string;
}) {
  scriptsWithFiles.forEach(({ name, content }) => {
    router.get("/" + prefix + name.replace("ts", "js"), (_req, res) => {
      res.append("Content-Type", "text/javascript");
      res.send(scriptsCache[name] || content);
    });
  });
}
*/

if (import.meta.main) {
  const projectMeta = await getJson<ProjectMeta>("./meta.json");

  serveGustwind(projectMeta, Deno.cwd());
}

export { serveGustwind };
