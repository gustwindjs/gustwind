import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import { fs, path } from "../server-deps.ts";
import { importPlugins } from "../gustwind-utilities/plugins.ts";
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
  const startTime = performance.now();
  const workerPool = createWorkerPool<BuildWorkerEvent>(
    amountOfThreads,
  );

  workerPool.addTaskToEach({
    type: "init",
    payload: { cwd, pluginDefinitions, outputDirectory },
  });

  await fs.ensureDir(outputDirectory).then(async () => {
    await Deno.remove(outputDirectory, { recursive: true });

    const { router, tasks } = await importPlugins({
      cwd,
      pluginDefinitions,
      outputDirectory,
      mode: "production",
    });
    tasks.forEach((task) => workerPool.addTaskToQueue(task));

    const routes = await router.getAllRoutes();

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

    if (DEBUG) {
      const routeGenerationTime = performance.now();

      console.log(
        `Generated routes in ${routeGenerationTime - startTime} ms`,
        routes,
      );
    }

    if (DEBUG) {
      const initTime = performance.now();

      console.log(`Generated routes and tasks in ${initTime - startTime} ms`);
    }

    return new Promise((resolve) => {
      workerPool.onWorkFinished(() => {
        workerPool.terminate();

        // https://esbuild.github.io/getting-started/#deno
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
