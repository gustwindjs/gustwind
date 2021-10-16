import { ensureDir } from "fs";
import { stop } from "esbuild";
import { join } from "path";
import { getComponents, getJson } from "./utils.ts";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import { compileScripts } from "./compileScripts.ts";
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
      `Generated ${routeAmount} pages in ${duration}ms.\nAverage: ${
        Math.round(
          duration /
            routeAmount * 1000,
        ) / 1000
      } ms per page.`,
    );
  };

  const components = await getComponents("./components");
  const outputDirectory = "./build";

  ensureDir(outputDirectory).then(async () => {
    await writeScripts(projectMeta.paths.scripts, outputDirectory);

    const transformDirectory = join(outputDirectory, "transforms");
    ensureDir(transformDirectory).then(async () => {
      await writeScripts(projectMeta.paths.transforms, transformDirectory);

      stop();
    });

    Deno.writeTextFile(
      join(outputDirectory, "components.json"),
      JSON.stringify(components),
    );

    const renderPage = getPageRenderer({
      components,
      mode: "production",
    });
    const ret = await generateRoutes({
      renderPage: async (route, path, context, page) => {
        // TODO: Push this behind a verbose flag
        // console.log("Building", route);

        const dir = join(outputDirectory, route);
        const [html, js] = await renderPage(route, path, context, page);

        ensureDir(dir).then(() => {
          Deno.writeTextFile(
            join(dir, "context.json"),
            JSON.stringify(context),
          );
          Deno.writeTextFile(
            join(dir, "definition.json"),
            JSON.stringify(page),
          );
          Deno.writeTextFile(
            join(dir, "index.html"),
            html,
          );
          if (js) {
            Deno.writeTextFile(join(dir, "index.js"), js);
          }
        });
      },
      pagesPath: "./pages",
      siteMeta: projectMeta.meta,
    });

    routes = ret.routes;
  });
}

async function writeScripts(scriptsPath: string, outputPath: string) {
  const scriptsWithFiles = await compileScripts(scriptsPath);

  return Promise.all(
    scriptsWithFiles.map(({ name, content }) =>
      content
        ? Deno.writeTextFile(
          join(outputPath, name.replace("ts", "js")),
          content,
        )
        : Promise.resolve()
    ),
  );
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta);
}

export { build };
