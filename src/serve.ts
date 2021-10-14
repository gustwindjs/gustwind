import { Application, Router } from "oak";
import { getComponents, getJson, watch } from "utils";
import { basename, join } from "path";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer, renderBody } from "./getPageRenderer.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { getWebsocketServer } from "./webSockets.ts";
import type { Page, ProjectMeta } from "../types.ts";

// The cache is populated based on web socket calls. If a page
// is updated by web sockets, it should end up here so that
// oak router can then refer to the cached version instead.
const cachedPages: Record<string, { bodyMarkup: string; page: Page }> = {};

async function serve(
  {
    developmentPort,
    meta: siteMeta,
    paths: { components: componentsPath, pages: pagesPath },
  }: ProjectMeta,
) {
  console.log(`Serving at ${developmentPort}`);

  const wss = getWebsocketServer();
  const components = await getComponents(componentsPath);
  const app = new Application();
  const router = new Router();

  const stylesheet = getStyleSheet();
  const renderPage = getPageRenderer({
    components,
    stylesheet,
    mode: "development",
  });
  const { paths } = await generateRoutes({
    renderPage(route, path, context, page) {
      router.get(route, async (ctx) => {
        try {
          ctx.response.headers.set(
            "Content-Type",
            "text/html; charset=UTF-8",
          );

          const data = await renderPage(
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

          ctx.response.body = new TextEncoder().encode(
            data,
          );
        } catch (err) {
          console.error(err);

          ctx.response.body = new TextEncoder().encode(err.stack);
        }
      });
    },
    pagesPath,
    siteMeta,
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

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
            // TODO: In case a component was updated, related pages should be
            // updated as well instead of skipping the updates!
            if (matchedPath.includes(basename(componentsPath))) {
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

          const { meta, page } = await getJson<Page>(pagePath);
          const bodyMarkup = await renderBody(
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

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  serve(siteMeta);
}

export { serve };
