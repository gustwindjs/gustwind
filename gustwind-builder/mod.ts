import { fs, path } from "../server-deps.ts";
import { importPlugins } from "../gustwind-utilities/plugins.ts";
import { createWorkerPool } from "./createWorkerPool.ts";
import type { BuildWorkerEvent, PluginOptions } from "../types.ts";

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
  const startTime = performance.now();
  const workerPool = createWorkerPool<BuildWorkerEvent>(
    amountOfThreads,
  );

  workerPool.addTaskToEach({
    type: "init",
    payload: { cwd, pluginDefinitions, outputDirectory },
  });

  await fs.ensureDir(outputDirectory);
  await Deno.remove(outputDirectory, { recursive: true });

  const { router, prepareTasks, finalTasks } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    mode: "production",
  });
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
        routes,
        route,
        dir: path.join(outputDirectory, url),
        url: url === "/" ? "/" : "/" + url,
      },
    });
  });

  let finishedAmounts = 0;
  return new Promise((resolve) => {
    workerPool.onWorkFinished(() => {
      // The second finish means final tasks have run
      if (!finishedAmounts) {
        finalTasks.forEach((task) => workerPool.addTaskToQueue(task));

        finishedAmounts++;

        return;
      }

      workerPool.terminate();

      const endTime = performance.now();
      const duration = endTime - startTime;
      const routeAmount = Object.keys(routes).length;

      // TODO: This might belong to a stats plugin
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
