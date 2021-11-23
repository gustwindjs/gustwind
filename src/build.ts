import { esbuild, fs, path } from "../deps.ts";
import { dir, getJson, resolvePaths } from "../utils/fs.ts";
import { getDefinitions } from "./getDefinitions.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import type {
  BuildWorkerEvent,
  Component,
  Layout,
  ProjectMeta,
  Route,
} from "../types.ts";

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
  const [routes, layouts, components] = await Promise.all([
    getJson<Record<string, Route>>(projectPaths.routes),
    getDefinitions<Layout>(projectPaths.layouts),
    getDefinitions<Component>(projectPaths.components),
  ]);

  const expandedRoutes = flattenRoutes(
    await expandRoutes({
      routes,
      dataSourcesPath: projectPaths.dataSources,
      transformsPath: projectPaths.transforms,
    }),
  );
  const outputDirectory = projectPaths.output;

  if (!expandedRoutes) {
    throw new Error("No routes found");
  }

  await fs.ensureDir(outputDirectory).then(async () => {
    await Deno.remove(outputDirectory, { recursive: true });

    const tasks: BuildWorkerEvent[] = [];

    Object.entries(expandedRoutes).forEach(([url, route]) => {
      tasks.push({
        type: "build",
        payload: {
          layout: layouts[route.layout],
          route,
          pagePath: "", // TODO
          dir: path.join(outputDirectory, url),
          url,
        },
      });
    });

    if (DEBUG) {
      const routeGenerationTime = performance.now();

      console.log(
        `Generated routes in ${routeGenerationTime - startTime} ms`,
        expandedRoutes,
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
        const routeAmount = Object.keys(expandedRoutes).length;

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
