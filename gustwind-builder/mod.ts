import * as path from "node:path";
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import {
  cleanUpPlugins,
  finishPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi } from "../load-adapters/deno.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, PluginOptions } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function build(
  { cwd, outputDirectory, threads, pluginDefinitions }: {
    cwd: string;
    outputDirectory: string;
    threads: string;
    pluginDefinitions: PluginOptions[];
  },
) {
  const amountOfThreads = getAmountOfThreads(threads);

  if (!amountOfThreads) {
    throw new Error(`Passed unknown amount of threads ${amountOfThreads}`);
  }

  console.log(
    `Building to static with ${amountOfThreads} thread${
      amountOfThreads > 1 ? "s" : ""
    }`,
  );
  const workerPool = createWorkerPool<BuildWorkerEvent>(
    amountOfThreads,
  );

  workerPool.addTaskToEach({
    type: "init",
    payload: { cwd, pluginDefinitions, outputDirectory },
  });

  await fs.ensureDir(outputDirectory);
  await Deno.remove(outputDirectory, { recursive: true });
  await fs.ensureDir(outputDirectory);

  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    initLoadApi,
    mode: "production",
  });
  const prepareTasks = await preparePlugins(plugins);
  prepareTasks.forEach((task) => workerPool.addTaskToQueue(task));

  const { routes, tasks: routerTasks } = await router.getAllRoutes();
  routerTasks.forEach((task) => workerPool.addTaskToQueue(task));

  if (!routes) {
    throw new Error("No routes found");
  }

  Object.entries(routes).forEach(([url, route]) => {
    if (!route.layout) {
      return;
    }

    workerPool.addTaskToQueue({
      type: "build",
      payload: {
        route,
        dir: path.join(outputDirectory, url),
        url: url === "/" ? "/" : "/" + url,
      },
    });
  });

  // Avoid triggering finish too early since some workers
  // might finish work while new tasks are added.
  workerPool.listenForFinish();
  let finishedAmounts = 0;
  return new Promise((resolve) => {
    workerPool.onWorkFinished(async () => {
      DEBUG && console.log("finished", finishedAmounts);

      // The second finish means final tasks have run
      if (!finishedAmounts) {
        const finishTasks = await finishPlugins(plugins);

        finishTasks.forEach((task) => workerPool.addTaskToQueue(task));

        await cleanUpPlugins(plugins, routes);

        finishedAmounts++;

        return;
      }

      workerPool.terminate();

      resolve(undefined);
    });
  });
}

function getAmountOfThreads(amountOfThreads: string) {
  if (amountOfThreads === "cpuMax") {
    // -1 since the main thread needs one CPU but at least one
    return Math.max(navigator.hardwareConcurrency - 1, 1);
  }
  if (amountOfThreads === "cpuHalf") {
    return Math.max(Math.ceil(navigator.hardwareConcurrency / 2), 1);
  }

  return Number(amountOfThreads);
}

export { build };
