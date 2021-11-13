import { esbuild, fs, path } from "../deps.ts";
import { getJson, resolvePaths } from "../utils/fs.ts";
import { compileScript, compileScripts } from "../utils/compileScripts.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, ProjectMeta } from "../types.ts";

async function build(projectMeta: ProjectMeta, projectRoot: string) {
  const amountOfBuildThreads = getAmountOfThreads(
    projectMeta.amountOfBuildThreads,
  );
  console.log(
    `Building to static with ${amountOfBuildThreads} thread${
      amountOfBuildThreads > 1 ? "s" : ""
    }`,
  );

  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;
  const startTime = performance.now();
  const components = await getComponents("./components");
  const outputDirectory = projectPaths.output;

  await fs.ensureDir(outputDirectory).then(async () => {
    const transformDirectory = path.join(outputDirectory, "transforms");

    // TODO: Push these as tasks to workers
    await Promise.all([
      projectMeta.features?.showEditorAlways
        ? writeScript(outputDirectory, "twindSetup.js", projectPaths.twindSetup)
        : Promise.resolve(),
      writeScripts(outputDirectory, "./scripts"),
      writeScripts(outputDirectory, projectPaths.scripts),
      writeAssets(outputDirectory, projectPaths.assets),
      fs.ensureDir(transformDirectory).then(() =>
        writeScripts(projectPaths.transforms, transformDirectory)
      ),
    ]);

    esbuild.stop();

    if (projectMeta.features?.showEditorAlways) {
      Deno.writeTextFile(
        path.join(outputDirectory, "components.json"),
        JSON.stringify(components),
      );
    }

    const tasks: BuildWorkerEvent[] = [];
    const { routes } = await generateRoutes({
      dataSourcesPath: projectPaths.dataSources,
      transformsPath: projectPaths.transforms,
      renderPage: ({ route, path: filePath, page, context }) =>
        tasks.push({
          type: "build",
          payload: {
            route,
            filePath,
            dir: path.join(outputDirectory, route),
            extraContext: context,
            page,
          },
        }),
      pagesPath: "./pages",
    });
    const workerPool = createWorkerPool<BuildWorkerEvent>(
      amountOfBuildThreads,
    );

    workerPool.addTaskToEach({
      type: "init",
      payload: {
        components,
        projectMeta,
      },
    });

    return new Promise((resolve) => {
      workerPool.onWorkFinished(() => {
        workerPool.terminate();

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

        resolve(undefined);
      });

      tasks.forEach((task) => workerPool.addTaskToQueue(task));
    });
  });
}

function getAmountOfThreads(
  amountOfThreads: ProjectMeta["amountOfBuildThreads"],
) {
  if (amountOfThreads === "cpuMax") {
    // -1 since the main thread needs one CPU but at least one
    return Math.max(navigator.hardwareConcurrency - 1, 1);
  }

  return amountOfThreads;
}

async function writeScripts(
  outputPath: string,
  scriptsPath: ProjectMeta["paths"]["scripts"],
) {
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

async function writeScript(
  outputPath: string,
  scriptName: string,
  scriptPath?: string,
) {
  if (!scriptPath) {
    return Promise.resolve();
  }

  const script = await compileScript({
    path: scriptPath,
    name: scriptName,
    mode: "production",
  });

  return Deno.writeTextFile(path.join(outputPath, scriptName), script.content);
}

function writeAssets(
  outputPath: string,
  assetsPath: ProjectMeta["paths"]["assets"],
) {
  fs.copy(assetsPath, outputPath, { overwrite: true });
}

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta, Deno.cwd());
}

export { build };
