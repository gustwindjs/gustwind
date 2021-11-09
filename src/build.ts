import { esbuild, fs, path } from "../deps.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { compileScripts } from "../utils/compileScripts.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import type { ProjectMeta } from "../types.ts";

// TODO: Set up worker pooling
const amountOfWorkers = navigator.hardwareConcurrency - 1;

async function build(projectMeta: ProjectMeta, projectRoot: string) {
  console.log("Building to static");

  const projectPaths = resolvePaths(projectRoot, projectMeta.paths);
  let routes: string[] = [];

  const startTime = performance.now();
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

    const ret = await generateRoutes({
      transformsPath: projectPaths.transforms,
      renderPage: (route, filePath, page, extraContext) => {
        // TODO: Push this behind a verbose flag
        // console.log("Building", route);

        const worker = createWorker();
        const dir = path.join(outputDirectory, route);

        worker.postMessage({
          projectPaths,
          route,
          filePath,
          dir,
          extraContext,
          components: components,
          projectMeta,
          page,
        });
      },
      pagesPath: "./pages",
      siteName: projectMeta.siteName,
    });

    routes = ret.routes;
  });

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
}

function createWorker() {
  return new Worker(
    new URL("./buildWorker.ts", import.meta.url).href,
    {
      type: "module",
      deno: {
        namespace: true,
        permissions: "inherit",
      },
    },
  );
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
