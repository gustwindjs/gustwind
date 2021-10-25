import { Application, Router } from "oak";
import { getComponent, getComponents } from "./getComponents.ts";
import { getJson, watch } from "./fsUtils.ts";
import { basename, extname, join } from "path";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import { renderBody } from "./renderBody.ts";
import { getWebsocketServer } from "./webSockets.ts";
import { compileScripts } from "./compileScripts.ts";
import { getBrowserImportMap } from "./getBrowserImportMap.ts";
import { compileTypeScript } from "./compileTypeScript.ts";
import type { Components, ImportMap, Page, ProjectMeta } from "../types.ts";

// The cache is populated based on web socket calls. If a page
// is updated by web sockets, it should end up here so that
// oak router can then refer to the cached version instead.
const cachedPages: Record<string, { bodyMarkup: string; page: Page }> = {};

// The cache is populated if and when scripts are changed.
const cachedScripts: Record<string, string> = {};

async function serve(
  {
    developmentPort,
    meta: siteMeta,
    paths: {
      components: componentsPath,
      pages: pagesPath,
      scripts: scriptsPath,
      transforms: transformsPath,
    },
    browserDependencies,
  }: ProjectMeta,
) {
  console.log(`Serving at ${developmentPort}`);

  const importMapName = "import_map.json";
  const importMap = await getJson<ImportMap>(
    importMapName,
  );

  let components: Components;
  try {
    components = await getComponents(componentsPath);
  } catch (error) {
    console.error(error);

    return;
  }

  const browserImportMap = getBrowserImportMap(
    browserDependencies,
    importMap,
  );

  const app = new Application();
  const router = new Router();
  const wss = getWebsocketServer();

  serveScripts(router, scriptsPath, importMap);
  serveScripts(router, transformsPath, importMap, "transforms/");

  const mode = "development";
  const renderPage = getPageRenderer({
    components,
    mode,
    importMap: browserImportMap,
  });
  const { paths } = await generateRoutes({
    renderPage(route, path, context, page) {
      router.get(
        route === "/" ? "/context.json" : `${route}/context.json`,
        (ctx) => {
          ctx.response.body = new TextEncoder().encode(JSON.stringify(context));
        },
      );

      router.get(route, async (ctx) => {
        try {
          ctx.response.headers.set(
            "Content-Type",
            "text/html; charset=UTF-8",
          );

          const [html, js] = await renderPage(
            ctx.request.url.pathname,
            path,
            context,
            // If there's cached data, use it instead. This fixes
            // the case in which there was an update over web socket and
            // also avoids the need to hit the file system for getting
            // the latest data.
            cachedPages[route]?.page || page,
            cachedPages[route]?.bodyMarkup,
          );

          if (js) {
            await router.get(
              route === "/" ? "/index.js" : `${route}/index.js`,
              (ctx) => {
                ctx.response.headers.set("Content-Type", "text/javascript");
                ctx.response.body = new TextEncoder().encode(js);
              },
            );
          }

          ctx.response.body = new TextEncoder().encode(
            html,
          );
        } catch (err) {
          console.error(err);

          ctx.response.body = new TextEncoder().encode(err.stack);
        }
      });

      router.get(
        route === "/" ? "/definition.json" : `${route}/definition.json`,
        (ctx) => {
          ctx.response.body = new TextEncoder().encode(JSON.stringify(page));
        },
      );
    },
    pagesPath,
    siteMeta,
  });

  router.get("/components.json", (ctx) => {
    ctx.response.body = new TextEncoder().encode(JSON.stringify(components));
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  watch(scriptsPath, ".ts", async (matchedPath) => {
    const scriptName = basename(matchedPath, extname(matchedPath));

    console.log("Changed script", matchedPath);

    cachedScripts[scriptName + ".ts"] = await compileTypeScript(
      matchedPath,
      mode,
      importMap,
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

  watch(
    ".",
    ".json",
    (matchedPath) => {
      wss.clients.forEach(async (socket) => {
        // 1 for open, https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
        if (socket.state === 1) {
          console.log("watch - Refresh ws");

          const pagePath = join(
            pagesPath,
            basename(matchedPath, import.meta.url),
          );
          const path = paths[pagePath];

          if (!path) {
            if (matchedPath.includes(basename(componentsPath))) {
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
              Object.keys(paths),
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
            pageJson,
            page,
            components,
            // TODO: Fix context
            // Resolve against data again if data sources have changes
            path.context,
            path.route,
          );

          // Cache page so that manual refresh at the client side still
          // has access to it.
          cachedPages[path.route] = {
            bodyMarkup,
            // TODO: Improve naming
            // Update page content.
            page: { ...path.page, page },
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

  await app.listen({ port: developmentPort });
}

async function serveScripts(
  router: Router,
  scriptsPath: string,
  importMap: ImportMap,
  prefix = "",
) {
  const scriptsWithFiles = await compileScripts(
    scriptsPath,
    "development",
    importMap,
  );

  scriptsWithFiles.forEach(({ name, content }) => {
    router.get("/" + prefix + name.replace("ts", "js"), (ctx) => {
      ctx.response.headers.set("Content-Type", "text/javascript");
      ctx.response.body = new TextEncoder().encode(
        cachedScripts[name] || content,
      );
    });
  });
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  serve(siteMeta);
}

export { serve };
