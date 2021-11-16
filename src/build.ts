import { esbuild, fs, path } from "../deps.ts";
import { dir, getJson, resolvePaths } from "../utils/fs.ts";
import { getComponents } from "./getComponents.ts";
import { generateRoutes } from "./generateRoutes.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, ProjectMeta } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

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
    await Deno.remove(outputDirectory, { recursive: true });

    const tasks: BuildWorkerEvent[] = [];

    // TODO: See if route generation can be workerized. The idea
    // would be that in that case for complex routes (i.e. [] expansion)
    // the worker would create new tasks on demand.
    const { routes } = await generateRoutes({
      dataSourcesPath: projectPaths.dataSources,
      transformsPath: projectPaths.transforms,
      renderPage: async ({ route, path: filePath, page, context }) => {
        const dir = path.join(outputDirectory, route);

        await fs.ensureDir(dir);

        tasks.push({
          type: "build",
          payload: {
            route,
            filePath,
            dir,
            extraContext: context,
            page,
          },
        });

        if (projectMeta.features?.showEditorAlways) {
          tasks.push({
            type: "writeFile",
            payload: {
              outputPath: path.join(dir, "definition.json"),
              data: JSON.stringify(page),
            },
          });
        }
      },
      pagesPath: "./pages",
    });

    if (DEBUG) {
      const routeGenerationTime = performance.now();

      console.log(`Generated routes in ${routeGenerationTime - startTime} ms`);
    }

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

    if (projectMeta.features?.showEditorAlways) {
      tasks.push({
        type: "writeScript",
        payload: {
          outputDirectory,
          scriptName: "twindSetup.js",
          scriptPath: projectPaths.twindSetup,
        },
      });

      const transformDirectory = path.join(outputDirectory, "transforms");
      await fs.ensureDir(transformDirectory);

      const transformScripts = await dir(projectPaths.transforms, ".ts");
      transformScripts.forEach(({ name: scriptName, path: scriptPath }) =>
        tasks.push({
          type: "writeScript",
          payload: {
            outputDirectory: transformDirectory,
            scriptName,
            scriptPath,
          },
        })
      );

      tasks.push({
        type: "writeFile",
        payload: {
          outputPath: path.join(outputDirectory, "components.json"),
          data: JSON.stringify(components),
        },
      });
    }

    if (projectPaths.scripts) {
      const projectScripts = await dir(projectPaths.scripts, ".ts");
      projectScripts.forEach(({ name: scriptName, path: scriptPath }) =>
        tasks.push({
          type: "writeScript",
          payload: {
            outputDirectory,
            scriptName,
            scriptPath,
          },
        })
      );
    }

    projectPaths.assets && tasks.push({
      type: "writeAssets",
      payload: {
        outputPath: outputDirectory,
        assetsPath: projectPaths.assets,
      },
    });

    if (DEBUG) {
      const initTime = performance.now();

      console.log(`Generated routes and tasks in ${initTime - startTime} ms`);
    }

    return new Promise((resolve) => {
      workerPool.onWorkFinished(() => {
        workerPool.terminate();

        esbuild.stop();

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

if (import.meta.main) {
  const siteMeta = await getJson<ProjectMeta>("./meta.json");

  build(siteMeta, Deno.cwd());
}

export { build };
