import { Application, Router } from "oak";
import { getComponents, getJson, watch } from "utils";
import { basename, join } from "path";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer, renderBody } from "./getPageRenderer.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { getWebsocketServer } from "./webSockets.ts";
import type { Page, ProjectMeta } from "../types.ts";

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
            page,
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

          socket.send(
            JSON.stringify({
              type: "refresh",
              payload: {
                bodyMarkup: await renderBody(
                  page,
                  components,
                  // TODO: Fix context
                  // Resolve against data again if data sources have changes
                  path.context,
                  path.route,
                ),
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
