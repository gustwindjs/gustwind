import { esbuild, fs, path } from "../server-deps.ts";
import { dir, getJson, resolvePaths } from "../utilities/fs.ts";
import { getDefinitions } from "../gustwind-utilities/getDefinitions.ts";
import {
  applyPrepareBuilds,
  importPlugin,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, ProjectMeta, Router } from "../types.ts";
import type { Component } from "../breezewind/types.ts";

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

  const [layouts, components] = await Promise.all([
    getDefinitions<Component | Component[]>(projectPaths.layouts),
    getDefinitions<Component>(projectPaths.components),
  ]);

  // TODO: Trigger beforeEachRequest for each plugin here
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

  const outputDirectory = projectPaths.output;
  const router = await importPlugin<Router>(
    projectMeta.router,
    projectMeta,
  );

  const routes = await router.getAllRoutes();

  if (!routes) {
    throw new Error("No routes found");
  }

  await fs.ensureDir(outputDirectory).then(async () => {
    await Deno.remove(outputDirectory, { recursive: true });

    Object.entries(routes).forEach(([url, route]) => {
      if (!route.layout) {
        return;
      }

      workerPool.addTaskToQueue({
        type: "build",
        payload: {
          layout: layouts[route.layout],
          route,
          pagePath: url === "/" ? "/" : "/" + url + "/",
          dir: path.join(outputDirectory, url),
          url: url === "/" ? "/" : "/" + url + "/",
        },
      });
    });

    if (DEBUG) {
      const routeGenerationTime = performance.now();

      console.log(
        `Generated routes in ${routeGenerationTime - startTime} ms`,
        routes,
      );
    }

    if (projectPaths.scripts) {
      const projectScripts = (await Promise.all(
        projectPaths.scripts.map((p) => dir(p, ".ts")),
      )).flat();

      DEBUG && console.log("found project scripts", projectScripts);

      projectScripts.forEach(({ name: scriptName, path: scriptPath }) =>
        workerPool.addTaskToQueue({
          type: "writeScript",
          payload: {
            outputDirectory,
            scriptName,
            scriptPath,
          },
        })
      );
    }

    assetsPath && workerPool.addTaskToQueue({
      type: "writeAssets",
      payload: {
        outputPath: path.join(outputDirectory, assetsPath),
        assetsPath: projectPaths.assets,
      },
    });

    const plugins = await importPlugins(projectMeta);
    const pluginTasks = await applyPrepareBuilds({ plugins, components });
    pluginTasks.forEach((task) => workerPool.addTaskToQueue(task));

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
        const routeAmount = Object.keys(routes).length;

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
  if (amountOfThreads === "cpuHalf") {
    return Math.max(Math.ceil(navigator.hardwareConcurrency / 2), 1);
  }

  return amountOfThreads;
}

if (import.meta.main) {
  const projectMeta = await getJson<ProjectMeta>("./meta.json");

  build(projectMeta, Deno.cwd());
}

export { build };
