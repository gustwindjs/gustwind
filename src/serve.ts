import {
  opine,
  Router,
  serveStatic,
} from "https://deno.land/x/opine@1.9.0/mod.ts";
import { cache } from "https://deno.land/x/cache@0.2.13/mod.ts";
import { fs, path as _path } from "../deps.ts";
import { compileScript, compileScripts } from "../utils/compileScripts.ts";
import { compileTypeScript } from "../utils/compileTypeScript.ts";
import { getJson, resolvePaths, watch } from "../utils/fs.ts";
import { trim } from "../utils/string.ts";
import { getDefinition, getDefinitions } from "./getDefinitions.ts";
import { renderHTML, renderPage } from "./renderPage.ts";
import { getWebsocketServer } from "./webSockets.ts";
import { expandRoutes } from "./expandRoutes.ts";
import type { Component, Layout, ProjectMeta, Route } from "../types.ts";

// Include Gustwind scripts to the depsgraph so they can be served at CLI
import "../scripts/_pageEditor.ts";
import "../scripts/_toggleEditor.ts";
import "../scripts/_webSocketClient.ts";

// The cache is populated based on web socket calls. If a layout
// is updated by web sockets, it should end up here so that
// oak router can then refer to the cached version instead.
const cachedLayouts: Record<string, Layout> = {};

// The cache is populated if and when scripts are changed.
const cachedScripts: Record<string, string> = {};

// This is replaced when the user changes meta.json
let cachedProjectMeta: ProjectMeta;

const DEBUG = Deno.env.get("DEBUG") === "1";

async function serve(projectMeta: ProjectMeta, projectRoot: string) {
  const assetsPath = projectMeta.paths.assets;
  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;

  const [routes, layouts, components] = await Promise.all([
    getJson<Record<string, Route>>(projectPaths.routes),
    getDefinitions<Layout>(projectPaths.layouts),
    getDefinitions<Component>(projectPaths.components),
  ]);

  const app = opine();
  const wss = getWebsocketServer();

  if (import.meta.url.startsWith("file:///")) {
    DEBUG && console.log("Serving local scripts");

    await serveScripts(app, "./scripts");
  } else {
    DEBUG && console.log("Serving remote scripts");

    serveGustwindScripts(app);
  }
  await serveScript(app, "twindSetup.js", projectPaths.twindSetup);
  await serveScripts(app, projectPaths.scripts);
  await serveScripts(app, projectPaths.transforms, "transforms/");

  const mode = "development";
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

  assetsPath && app.use(cleanAssetsPath(assetsPath), serveStatic(assetsPath));

  app.get("/components.json", (_req, res) => res.json(components));

  // TODO: This can happen later on demand
  const expandedRoutes = await expandRoutes({
    routes,
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
  });

  // Use a custom router to capture dynamically generated routes. Otherwise
  // newly added routes would be after the catch-all route in the system
  // and the router would never get to them.
  const dynamicRouter = Router();
  app.use(dynamicRouter);
  app.use(async ({ url }, res) => {
    const matchedRoute = matchRoute(expandedRoutes, url);

    if (matchedRoute) {
      const matchedLayout = layouts[matchedRoute.layout];

      if (matchedLayout) {
        const layout = cachedLayouts[url] || matchedLayout;
        const [html, context, css] = await renderPage({
          projectMeta: cachedProjectMeta || projectMeta,
          // If there's cached data, use it instead. This fixes
          // the case in which there was an update over web socket and
          // also avoids the need to hit the file system for getting
          // the latest data.
          layout,
          route: matchedRoute, // TODO: Cache?
          mode: "development",
          pagePath: "", // TODO: figure out the path of the page in the system
          twindSetup,
          components,
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

  /*
  // Watch project scripts
  watchScripts(projectPaths.scripts);

  watch(
    projectRoot,
    ".json",
    (matchedPath) => {
      wss.clients.forEach(async (socket) => {
        // 1 for open, https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
        if (socket.state === 1) {
          console.log("watch - Refresh ws");

          const pagePath = _path.join(
            projectPaths.pages,
            _path.basename(matchedPath, import.meta.url),
          );
          const p = routePaths[pagePath];

          if (pagePath.endsWith("meta.json")) {
            const projectMeta = await getJson<ProjectMeta>(matchedPath);
            projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);
            cachedProjectMeta = projectMeta;

            socket.send(JSON.stringify({ type: "reloadPage" }));

            return;
          }

          if (!p) {
            if (matchedPath.includes(_path.basename(projectPaths.components))) {
              const [componentName, componentDefinition] = await getDefinition<Component>(
                matchedPath,
              );

              if (componentName && componentDefinition) {
                components[componentName] = componentDefinition;
              }

              socket.send(JSON.stringify({ type: "reload" }));

              return;
            }

            console.error(
              "Failed to find match for",
              matchedPath,
              "in",
              Object.keys(routePaths),
            );

            return;
          }

          let pageJson;
          try {
            pageJson = await getJson<Page>(pagePath);
          } catch (error) {
            // TODO: Send an error to the client to show
            console.error(error);

            return;
          }

          const { body, head } = pageJson;

          const [headMarkup, bodyMarkup] = await Promise.all([
            renderHTML(
              projectPaths.transforms,
              pageJson,
              head,
              components,
              await getContext(
                projectPaths.dataSources,
                projectPaths.transforms,
                pageJson.dataSources,
              ),
              p.route,
            ),
            renderHTML(
              projectPaths.transforms,
              pageJson,
              body,
              components,
              await getContext(
                projectPaths.dataSources,
                projectPaths.transforms,
                pageJson.dataSources,
              ),
              p.route,
            ),
          ]);

          // Cache page so that manual refresh at the client side still
          // has access to it.
          cachedPages[p.route] = {
            headMarkup,
            bodyMarkup,
            // Update page content.
            page: { ...p.page, body, head },
          };

          socket.send(
            JSON.stringify({
              type: "refresh",
              payload: {
                bodyMarkup,
                headMarkup,
              },
            }),
          );
        }
      });
    },
  );
  */

  function watchScripts(scripts?: string) {
    scripts &&
      watch(scripts, ".ts", async (matchedPath) => {
        const scriptName = _path.basename(
          matchedPath,
          _path.extname(matchedPath),
        );

        console.log("Changed script", matchedPath);

        cachedScripts[scriptName + ".ts"] = await compileTypeScript(
          matchedPath,
          mode,
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

  await app.listen({ port: projectMeta.port });
}

function matchRoute(
  routes: Route["routes"],
  url: string,
): Route | undefined {
  if (!routes) {
    return;
  }

  const parts = trim(url, "/").split("/");
  const match = routes[url] || routes[parts[0]];

  if (match && match.routes && parts.length > 1) {
    return matchRoute(match.routes, parts.slice(1).join("/"));
  }

  return match;
}

function cleanAssetsPath(p: string) {
  return "/" + p.split("/").slice(1).join("/");
}

async function serveGustwindScripts(router: ReturnType<typeof opine>) {
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
  const scriptsWithFiles = await Promise.all([
    { name: "_pageEditor.ts", file: pageEditor },
    { name: "_toggleEditor.ts", file: toggleEditor },
    { name: "_webSocketClient.ts", file: wsClient },
    { name: "_twindRuntime.ts", file: twindRuntime },
  ].map(({ name, file: { path } }) =>
    compileScript({ name, path, mode: "development" })
  ));

  DEBUG && console.log("serving gustwind scripts", scriptsWithFiles);

  routeScripts(router, scriptsWithFiles);
}

async function serveScripts(
  router: ReturnType<typeof opine>,
  scriptsPath?: string,
  prefix = "",
) {
  if (!scriptsPath) {
    return;
  }

  try {
    const scriptsWithFiles = await compileScripts(scriptsPath, "development");

    routeScripts(router, scriptsWithFiles, prefix);
  } catch (error) {
    console.error(error);
  }
}

async function serveScript(
  router: ReturnType<typeof opine>,
  scriptName: string,
  scriptPath?: string,
) {
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

    routeScripts(router, [script]);
  } catch (error) {
    console.error(error);
  }
}

function routeScripts(
  router: ReturnType<typeof opine>,
  scriptsWithFiles: { path: string; name: string; content: string }[],
  prefix = "",
) {
  scriptsWithFiles.forEach(({ name, content }) => {
    router.get("/" + prefix + name.replace("ts", "js"), (_req, res) => {
      res.append("Content-Type", "text/javascript");
      res.send(cachedScripts[name] || content);
    });
  });
}

if (import.meta.main) {
  const projectMeta = await getJson<ProjectMeta>("./meta.json");

  serve(projectMeta, Deno.cwd());
}

export { serve };
