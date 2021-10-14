import { ensureDir } from "fs";
import { join } from "path";
import { getComponents, getJson } from "utils";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import type { ProjectMeta } from "../types.ts";

async function build(projectMeta: ProjectMeta) {
  console.log("Building to static");

  let routes: string[] = [];

  // TODO: Maybe generateRoutes should become awaitable
  const startTime = performance.now();
  window.onunload = () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const routeAmount = routes.length;

    console.log(
      `Generated ${routeAmount} pages in ${duration}ms.\nAverage: ${Math.round(
        duration /
          routeAmount * 1000,
      ) / 1000} ms per page.`,
    );
  };

  const components = await getComponents("./components");
  const outputDirectory = "./build";

  ensureDir(outputDirectory).then(async () => {
    const stylesheet = getStyleSheet();
    const renderPage = getPageRenderer({
      components,
      stylesheet,
      mode: "production",
    });
    const ret = await generateRoutes({
      renderPage(route, path, context, page) {
        // TODO: Push this behind a verbose flag
        // console.log("Building", route);

        const dir = join(outputDirectory, route);

        ensureDir(dir).then(async () =>
          Deno.writeTextFile(
            join(dir, "index.html"),
            await renderPage(route, path, context, page),
          )
        );
      },
      pagesPath: "./pages",
      siteMeta: projectMeta.meta,
    });

    routes = ret.routes;
  });
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta);
}

export { build };
