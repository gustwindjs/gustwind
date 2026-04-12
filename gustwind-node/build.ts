import * as path from "node:path";
import {
  cp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  applyMatchRoutes,
  applyPlugins,
  cleanUpPlugins,
  finishPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initNodeLoadApi, stopModuleBundler } from "../load-adapters/node.ts";
import { createBuildBenchmark } from "../utilities/buildBenchmark.ts";
import { validateHtmlDirectory } from "../utilities/htmlValidation.ts";
import {
  clearCachedOutputs,
  CACHE_MANIFEST_PATH,
  hashDependencyTasks,
  hashRouteFingerprint,
  normalizeDependencyTasks,
  outputsExist,
  readIncrementalBuildCache,
  removeDeletedRouteOutputs,
  restoreCachedOutputs,
  toRelativeOutputPath,
  writeIncrementalBuildCache,
} from "../utilities/incrementalBuildCache.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { stripVoidElementClosers } from "../utilities/stripVoidElementClosers.ts";
import type { BuildWorkerEvent, PluginOptions, Route, Tasks } from "../types.ts";
import type { BuildBenchmark } from "../utilities/buildBenchmark.ts";
import type {
  DependencyTask,
  IncrementalBuildCache,
  IncrementalBuildRouteCacheEntry,
} from "../utilities/incrementalBuildCache.ts";

const DEBUG = isDebugEnabled();
type BuildNodeResult = {
  benchmark?: BuildBenchmark;
  cacheFrom?: string;
  cacheHits?: number;
  routesBuilt?: number;
  validation?: Awaited<ReturnType<typeof validateHtmlDirectory>>;
};

async function buildNode(
  {
    cwd,
    outputDirectory,
    pluginDefinitions,
    validateOutput = false,
    collectBenchmark = false,
    incremental = !collectBenchmark,
    cacheFrom = outputDirectory,
  }: {
    cwd: string;
    outputDirectory: string;
    pluginDefinitions: PluginOptions[];
    validateOutput?: boolean;
    collectBenchmark?: boolean;
    incremental?: boolean;
    cacheFrom?: string;
  },
): Promise<BuildNodeResult> {
  const previousCache = incremental
    ? await readIncrementalBuildCache(cwd, cacheFrom)
    : undefined;
  const preservesCurrentOutput = previousCache?.source.kind === "filesystem" &&
    path.resolve(previousCache.source.rootDirectory) === path.resolve(cwd, outputDirectory);

  if (!preservesCurrentOutput) {
    await rm(outputDirectory, { recursive: true, force: true });
  }
  await mkdir(outputDirectory, { recursive: true });
  const benchmark = collectBenchmark ? createBuildBenchmark(outputDirectory) : undefined;

  const { initialTasks, plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    initLoadApi: initNodeLoadApi,
    mode: "production",
  });

  try {
    const prepareTasks = await preparePlugins(plugins);
    const { routes, tasks: routerTasks } = await router.getAllRoutes();
    const globalDependencyTasks = normalizeDependencyTasks(
      initialTasks.concat(prepareTasks, routerTasks),
    );

    if (!routes) {
      throw new Error("No routes found");
    }

    if (preservesCurrentOutput) {
      await removeDeletedRouteOutputs(
        outputDirectory,
        previousCache?.cache,
        Object.keys(routes).map((url) => url === "/" ? "/" : "/" + url + "/"),
      );
    }

    const nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry> = {};
    const routeBuildResult = await runTaskQueue({
      benchmark,
      cwd,
      outputDirectory,
      incrementalCache: incremental ? previousCache?.cache : undefined,
      incrementalCacheSource: incremental ? previousCache?.source : undefined,
      incrementalCacheEnabled: incremental,
      nextIncrementalCacheRoutes,
      globalDependencyTasks,
      router,
      plugins,
      tasks: prepareTasks
        .concat(routerTasks)
        .concat(
          Object.entries(routes)
            .filter(([, route]) => Boolean(route.layout))
            .map(([url, route]) => ({
              type: "build",
              payload: {
                route,
                dir: path.join(outputDirectory, url),
                url: url === "/" ? "/" : "/" + url + "/",
              },
            })),
        ),
    });

    await runTaskQueue({
      benchmark,
      cwd,
      outputDirectory,
      incrementalCache: incremental ? previousCache?.cache : undefined,
      incrementalCacheSource: incremental ? previousCache?.source : undefined,
      incrementalCacheEnabled: incremental,
      nextIncrementalCacheRoutes,
      router,
      plugins,
      tasks: await finishPlugins(plugins),
    });

    await cleanUpPlugins(plugins, routes);

    const validation = validateOutput
      ? await validateHtmlDirectory(outputDirectory)
      : undefined;
    const benchmarkResult = benchmark?.finish();

    if (incremental) {
      await writeIncrementalBuildCache(
        outputDirectory,
        nextIncrementalCacheRoutes,
      );
    }

    return {
      benchmark: benchmarkResult,
      cacheHits: routeBuildResult.cacheHits,
      routesBuilt: routeBuildResult.routesBuilt,
      validation,
    };
  } finally {
    await stopModuleBundler();
  }
}

async function runTaskQueue(
  {
    benchmark,
    cwd,
    outputDirectory,
    incrementalCache,
    incrementalCacheSource,
    incrementalCacheEnabled,
    nextIncrementalCacheRoutes,
    globalDependencyTasks,
    router,
    plugins,
    tasks,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    cwd: string;
    outputDirectory: string;
    incrementalCache?: IncrementalBuildCache;
    incrementalCacheSource?: NonNullable<Awaited<ReturnType<typeof readIncrementalBuildCache>>>["source"];
    incrementalCacheEnabled: boolean;
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
    globalDependencyTasks?: DependencyTask[];
    router: {
      matchRoute(url: string): Promise<Route | undefined>;
    };
    plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
    tasks: Tasks;
  }): Promise<{
    cacheHits: number;
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
    routesBuilt: number;
  }> {
  const queue = [...tasks];
  let cacheHits = 0;
  let routesBuilt = 0;
  const globalFingerprint = globalDependencyTasks
    ? await hashDependencyTasks(cwd, globalDependencyTasks)
    : null;

  while (queue.length) {
    const task = queue.shift();

    if (!task) {
      continue;
    }

    DEBUG && console.log("node build - running task", task.type);
    benchmark?.markTaskProcessed();

    switch (task.type) {
      case "build": {
        const matchTaskPositions = snapshotPluginTaskPositions(plugins);
        const matchedRoute = await router.matchRoute(task.payload.url);
        const matchDependencyTasks = collectDependencyTaskDelta(
          plugins,
          matchTaskPositions,
        );

        if (!matchedRoute) {
          throw new Error(
            `Failed to find route ${task.payload.url} while building`,
          );
        }

        const previousRouteCache = incrementalCache?.routes[task.payload.url];
        const previousRouteFingerprint = previousRouteCache
          ? await hashRouteFingerprint(
            cwd,
            globalFingerprint,
            matchedRoute,
            previousRouteCache.dependencyTasks,
          )
          : null;

        if (
          incrementalCacheEnabled && previousRouteCache &&
          incrementalCacheSource &&
          previousRouteFingerprint === previousRouteCache.fingerprint &&
          await outputsExist(incrementalCacheSource, previousRouteCache.outputPaths)
        ) {
          await restoreCachedOutputs(
            incrementalCacheSource,
            outputDirectory,
            previousRouteCache.outputPaths,
          );
          nextIncrementalCacheRoutes[task.payload.url] = previousRouteCache;
          cacheHits++;
          break;
        }

        if (previousRouteCache) {
          await clearCachedOutputs(outputDirectory, previousRouteCache.outputPaths);
        }

        const routeStartTime = performance.now();
        const renderTaskPositions = snapshotPluginTaskPositions(plugins);
        const { markup, tasks: routeTasks } = await applyPlugins({
          plugins,
          url: task.payload.url,
          route: matchedRoute,
          matchRoute(url: string) {
            return applyMatchRoutes({ plugins, url });
          },
        });
        const renderDependencyTasks = collectDependencyTaskDelta(
          plugins,
          renderTaskPositions,
        );
        const dependencyTasks = normalizeDependencyTasks(
          matchDependencyTasks.concat(renderDependencyTasks),
        );

        queue.push(...routeTasks);
        const writeResult = await writeRenderedPage({
          dir: task.payload.dir,
          markup,
          outputDirectory,
          url: task.payload.url,
        });
        const outputPaths = [writeResult.outputPath].concat(
          getTaskOutputPaths(routeTasks),
        ).filter((outputPath) =>
          outputPath !== CACHE_MANIFEST_PATH
        );

        if (incrementalCacheEnabled) {
          const fingerprint = await hashRouteFingerprint(
            cwd,
            globalFingerprint,
            matchedRoute,
            dependencyTasks,
          );

          if (fingerprint) {
            nextIncrementalCacheRoutes[task.payload.url] = {
              dependencyTasks,
              fingerprint,
              outputPaths,
            };
          }
        }

        routesBuilt++;
        benchmark?.recordRoute({
          bytesWritten: writeResult.bytesWritten,
          durationMs: performance.now() - routeStartTime,
          memoryRssBytes: process.memoryUsage().rss,
          outputPath: writeResult.outputPath,
          url: task.payload.url,
        });
        break;
      }
      case "writeFile": {
        if (!task.payload.outputDirectory.endsWith(".html")) {
          const filePath = path.join(
            task.payload.outputDirectory,
            task.payload.file,
          );

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, task.payload.data);
        }
        break;
      }
      case "writeTextFile": {
        if (!task.payload.outputDirectory.endsWith(".html")) {
          const filePath = path.join(
            task.payload.outputDirectory,
            task.payload.file,
          );

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, task.payload.data);
        }
        break;
      }
      case "copyFiles": {
        await cp(
          task.payload.inputDirectory,
          path.join(task.payload.outputDirectory, task.payload.outputPath),
          { force: true, recursive: true },
        );
        break;
      }
      case "loadJSON":
      case "loadModule":
      case "listDirectory":
      case "readTextFile":
      case "init":
        break;
      default: {
        const _exhaustive: never = task;
        throw new Error(`Unsupported build task ${_exhaustive}`);
      }
    }
  }

  return { cacheHits, nextIncrementalCacheRoutes, routesBuilt };
}

async function writeRenderedPage(
  { dir, markup, outputDirectory, url }: {
    dir: string;
    markup: string;
    outputDirectory: string;
    url: string;
  },
) {
  if (
    url.endsWith(".json/") || url.endsWith(".xml/") ||
    url.endsWith(".html/")
  ) {
    const output = url.endsWith(".xml/") || url.endsWith(".json/")
      ? markup
      : stripVoidElementClosers(markup);
    await mkdir(path.dirname(dir), { recursive: true });
    await writeFile(dir, output);
    return {
      bytesWritten: Buffer.byteLength(output),
      outputPath: toRelativeOutputPath(outputDirectory, dir),
    };
  }

  await mkdir(dir, { recursive: true });
  const outputPath = path.join(dir, "index.html");
  const output = stripVoidElementClosers(markup);
  await writeFile(outputPath, output);

  return {
    bytesWritten: Buffer.byteLength(output),
    outputPath: toRelativeOutputPath(outputDirectory, outputPath),
  };
}

export { buildNode };
export type { BuildBenchmark, BuildNodeResult };

function snapshotPluginTaskPositions(
  plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"],
) {
  return plugins.map(({ tasks }) => tasks.length);
}

function collectDependencyTaskDelta(
  plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"],
  taskPositions: number[],
) {
  return plugins.flatMap(({ tasks }, index) => tasks.slice(taskPositions[index]));
}

function getTaskOutputPaths(tasks: Tasks) {
  return tasks.flatMap((task) => {
    switch (task.type) {
      case "writeFile":
      case "writeTextFile":
        return [task.payload.file];
      default:
        return [];
    }
  });
}
