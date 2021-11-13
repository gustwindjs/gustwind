import {
  opine,
  Router,
  serveStatic,
} from "https://deno.land/x/opine@1.9.0/mod.ts";
import { cache } from "https://deno.land/x/cache@0.2.13/mod.ts";
import { path } from "../deps.ts";
import { compileScript, compileScripts } from "../utils/compileScripts.ts";
import { compileTypeScript } from "../utils/compileTypeScript.ts";
import { getJson, resolvePaths, watch } from "../utils/fs.ts";
import { getComponent, getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import { renderBody } from "./renderBody.ts";
import { getContext } from "./getContext.ts";
import { getWebsocketServer } from "./webSockets.ts";
import type { Page, ProjectMeta } from "../types.ts";

// Include Gustwind scripts to the depsgraph so they can be served at CLI
import "../scripts/_pageEditor.ts";
import "../scripts/_toggleEditor.ts";
import "../scripts/_webSocketClient.ts";

// The cache is populated based on web socket calls. If a page
// is updated by web sockets, it should end up here so that
// oak router can then refer to the cached version instead.
const cachedPages: Record<string, { bodyMarkup: string; page: Page }> = {};

// The cache is populated if and when scripts are changed.
const cachedScripts: Record<string, string> = {};

// This is replaced when the user changes meta.json
let cachedProjectMeta: ProjectMeta;

async function serve(projectMeta: ProjectMeta, projectRoot: string) {
  const assetsPath = projectMeta.paths.assets;
  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;

  console.log(`Serving at ${projectMeta.developmentPort}`);

  const components = await getComponents("./components");
  const app = opine();
  const router = Router();
  const wss = getWebsocketServer();

  if (import.meta.url.startsWith("file:///")) {
    Deno.env.get("DEBUG") === "1" && console.log("Serving local scripts");

    serveScripts(router, "./scripts");
  } else {
    Deno.env.get("DEBUG") === "1" && console.log("Serving remote scripts");

    serveGustwindScripts(router);
  }
  serveScripts(router, projectPaths.scripts);
  serveScripts(router, projectPaths.transforms, "transforms/");

  const mode = "development";
  const twindSetup = projectPaths.twindSetup
    ? await import(projectPaths.twindSetup).then((m) => m.default)
    : {};
  const renderPage = getPageRenderer({
    components,
    mode,
    twindSetup,
  });
  const { paths: routePaths } = await generateRoutes({
    dataSourcesPath: projectPaths.dataSources,
    transformsPath: projectPaths.transforms,
    renderPage({ route, path, page, context }) {
      Deno.env.get("DEBUG") === "1" && console.log("render page", route, path);

      router.get(
        route === "/" ? "/context.json" : `${route}context.json`,
        (_req, res) => res.json(context),
      );

      router.get(route, async (req, res) => {
        try {
          res.append("Content-Type", "text/html; charset=UTF-8");

          const [html, js] = await renderPage({
            pathname: req.url,
            pagePath: path,
            // If there's cached data, use it instead. This fixes
            // the case in which there was an update over web socket and
            // also avoids the need to hit the file system for getting
            // the latest data.
            page: cachedPages[route]?.page || page,
            extraContext: context,
            initialBodyMarkup: cachedPages[route]?.bodyMarkup,
            projectMeta: cachedProjectMeta || projectMeta,
          });

          if (js) {
            await router.get(
              route === "/" ? "/index.js" : `${route}/index.js`,
              (_req, res) => {
                res.append("Content-Type", "text/javascript");
                res.send(js);
              },
            );
          }

          res.send(html);
        } catch (err) {
          console.error(err);

          res.send(err.stack);
        }
      });

      router.get(
        route === "/" ? "/definition.json" : `${route}definition.json`,
        (_req, res) => res.send(page),
      );
    },
    pagesPath: projectPaths.pages,
  });

  router.get("/components.json", (_req, res) => res.json(components));

  app.use(router);
  app.use(serveStatic(assetsPath));

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

          const pagePath = path.join(
            projectPaths.pages,
            path.basename(matchedPath, import.meta.url),
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
            if (matchedPath.includes(path.basename(projectPaths.components))) {
              const [componentName, componentDefinition] = await getComponent(
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

          const { meta, page } = pageJson;
          const bodyMarkup = await renderBody(
            projectPaths.transforms,
            pageJson,
            page,
            components,
            await getContext(
              projectPaths.dataSources,
              projectPaths.transforms,
              pageJson.dataSources,
            ),
            p.route,
          );

          // Cache page so that manual refresh at the client side still
          // has access to it.
          cachedPages[p.route] = {
            bodyMarkup,
            // TODO: Improve naming
            // Update page content.
            page: { ...p.page, page },
          };

          socket.send(
            JSON.stringify({
              type: "refresh",
              payload: {
                bodyMarkup,
                meta,
              },
            }),
          );
        }
      });
    },
  );

  function watchScripts(scripts: string) {
    scripts &&
      watch(scripts, ".ts", async (matchedPath) => {
        const scriptName = path.basename(
          matchedPath,
          path.extname(matchedPath),
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

  await app.listen({ port: projectMeta.developmentPort });
}

async function serveGustwindScripts(router: ReturnType<typeof Router>) {
  const pageEditor = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_pageEditor.ts",
  );
  const toggleEditor = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_toggleEditor.ts",
  );
  const wsClient = await cache(
    "https://deno.land/x/gustwind/gustwindScripts/_webSocketClient.ts",
  );
  const scriptsWithFiles = await Promise.all([
    { name: "_pageEditor.ts", file: pageEditor },
    { name: "_toggleEditor.ts", file: toggleEditor },
    { name: "_webSocketClient.ts", file: wsClient },
  ].map(({ name, file: { path } }) =>
    compileScript({ name, path, mode: "development" })
  ));

  routeScripts(router, scriptsWithFiles);
}

async function serveScripts(
  router: ReturnType<typeof Router>,
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

function routeScripts(
  router: ReturnType<typeof Router>,
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
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  serve(siteMeta, Deno.cwd());
}

export { serve };
