import { esbuild, fs, path } from "../deps.ts";
import { dir, getJson, resolvePaths } from "../utils/fs.ts";
import { getDefinitions } from "./getDefinitions.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, Component, ProjectMeta } from "../types.ts";

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

  const assetsPath = projectMeta.paths.assets;
  projectMeta.paths = resolvePaths(projectRoot, projectMeta.paths);

  const projectPaths = projectMeta.paths;
  const startTime = performance.now();
  const components = await getDefinitions<Component>(projectPaths.components);
  const outputDirectory = projectPaths.output;

  await fs.ensureDir(outputDirectory).then(async () => {
    await Deno.remove(outputDirectory, { recursive: true });

    const tasks: BuildWorkerEvent[] = [];

    // TODO: See if route generation can be workerized. The idea
    // would be that in that case for complex routes (i.e. [] expansion)
    // the worker would create new tasks on demand.
    /*
    const { routes } = await generateRoutes({
      dataSourcesPath: projectPaths.dataSources,
      transformsPath: projectPaths.transforms,
      renderPage: ({ route, path: filePath, page, context }) => {
        DEBUG && console.log("renderPage", route, filePath, page, context);

        const dir = path.join(outputDirectory, route);

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

        if (page.layout !== "xml" && projectMeta.features?.showEditorAlways) {
          tasks.push({
            type: "writeFile",
            payload: {
              dir,
              file: "definition.json",
              data: JSON.stringify(page),
            },
          });
        }
      },
      pagesPath: projectPaths.pages,
    });
    */
    const routes = {};

    if (DEBUG) {
      const routeGenerationTime = performance.now();

      console.log(
        `Generated routes in ${routeGenerationTime - startTime} ms`,
        routes,
        tasks,
      );
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
          dir: outputDirectory,
          file: "components.json",
          data: JSON.stringify(components),
        },
      });
    }

    if (projectPaths.scripts) {
      const projectScripts = await dir(projectPaths.scripts, ".ts");

      DEBUG && console.log("found project scripts", projectScripts);

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

    assetsPath && tasks.push({
      type: "writeAssets",
      payload: {
        outputPath: path.join(outputDirectory, assetsPath),
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

      DEBUG && console.log("Generated tasks", tasks);

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
  const projectMeta = await getJson<ProjectMeta>("./meta.json");

  build(projectMeta, Deno.cwd());
}

export { build };
