import { esbuild, fs, path } from "../deps.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { compileScripts } from "../utils/compileScripts.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import { getPageRenderer } from "./getPageRenderer.ts";
import type { ProjectMeta } from "../types.ts";

async function build(projectMeta: ProjectMeta, projectRoot: string) {
  console.log("Building to static");

  const projectPaths = resolvePaths(projectRoot, projectMeta.paths);
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
  const outputDirectory = projectPaths.output;

  await fs.ensureDir(outputDirectory).then(async () => {
    await Promise.all([
      writeScripts("./scripts", outputDirectory),
      writeScripts(projectPaths.scripts, outputDirectory),
    ]);

    const transformDirectory = path.join(outputDirectory, "transforms");
    fs.ensureDir(transformDirectory).then(async () => {
      await writeScripts(projectPaths.transforms, transformDirectory);

      esbuild.stop();
    });

    Deno.writeTextFile(
      path.join(outputDirectory, "components.json"),
      JSON.stringify(components),
    );

    const renderPage = getPageRenderer({
      transformsPath: projectPaths.transforms,
      components,
      mode: "production",
      projectMeta,
    });
    const ret = await generateRoutes({
      transformsPath: projectPaths.transforms,
      renderPage: async (route, filePath, context, page) => {
        // TODO: Push this behind a verbose flag
        // console.log("Building", route);

        const dir = path.join(outputDirectory, route);
        const [html, js] = await renderPage(route, filePath, context, page);

        fs.ensureDir(dir).then(() => {
          Deno.writeTextFile(
            path.join(dir, "context.json"),
            JSON.stringify(context),
          );
          Deno.writeTextFile(
            path.join(dir, "definition.json"),
            JSON.stringify(page),
          );
          Deno.writeTextFile(
            path.join(dir, "index.html"),
            html,
          );
          if (js) {
            Deno.writeTextFile(path.join(dir, "index.js"), js);
          }
        });
      },
      pagesPath: "./pages",
      siteName: projectMeta.siteName,
    });

    routes = ret.routes;
  });
}

async function writeScripts(scriptsPath: string, outputPath: string) {
  if (!scriptsPath) {
    return Promise.resolve();
  }

  const scriptsWithFiles = await compileScripts(scriptsPath, "production");

  return Promise.all(
    scriptsWithFiles.map(({ name, content }) =>
      content
        ? Deno.writeTextFile(
          path.join(outputPath, name.replace("ts", "js")),
          content,
        )
        : Promise.resolve()
    ),
  );
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta, Deno.cwd());
}

export { build };
