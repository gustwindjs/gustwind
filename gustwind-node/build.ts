import { availableParallelism } from "node:os";
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
  createSend,
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
import { runWithTaskLog } from "../utilities/taskLogContext.ts";
import type { PluginOptions, Route, Tasks } from "../types.ts";
import type { BuildBenchmark } from "../utilities/buildBenchmark.ts";
import type { ComponentDependencyGraph } from "../utilities/componentDependencyGraph.ts";
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

type RendererDependencyInfo = {
  componentGraph: ComponentDependencyGraph;
  globalDependencyTasks: DependencyTask[];
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
    routeConcurrency = getDefaultRouteConcurrency(),
  }: {
    cwd: string;
    outputDirectory: string;
    pluginDefinitions: PluginOptions[];
    validateOutput?: boolean;
    collectBenchmark?: boolean;
    incremental?: boolean;
    cacheFrom?: string;
    routeConcurrency?: number;
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

  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    initLoadApi: initNodeLoadApi,
    mode: "production",
  });

  try {
    const prepareTasks = await preparePlugins(plugins);
    const { routes, tasks: routerTasks } = await router.getAllRoutes();
    const rendererDependencyInfo = await getRendererDependencyInfo(plugins);
    const globalDependencyTasks = normalizeDependencyTasks(
      getGlobalDependencyTasks({
        plugins,
        prepareTasks,
        rendererDependencyInfo,
        routerTasks,
      }),
      cwd,
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
    await runTaskQueue({
      benchmark,
      outputDirectory,
      tasks: prepareTasks.concat(routerTasks),
    });
    const routeBuildResult = await runBuildTasks({
      benchmark,
      cwd,
      outputDirectory,
      incrementalCache: incremental ? previousCache?.cache : undefined,
      incrementalCacheSource: incremental ? previousCache?.source : undefined,
      incrementalCacheEnabled: incremental,
      nextIncrementalCacheRoutes,
      globalDependencyTasks,
      rendererDependencyInfo,
      routeConcurrency,
      router,
      plugins,
      tasks: Object.entries(routes)
        .filter(([, route]) => Boolean(route.layout))
        .map(([url, route]) => ({
          type: "build" as const,
          payload: {
            route,
            dir: path.join(outputDirectory, url),
            url: url === "/" ? "/" : "/" + url + "/",
          },
        })),
    });

    await runTaskQueue({
      benchmark,
      outputDirectory,
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
    outputDirectory,
    tasks,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    outputDirectory: string;
    tasks: Tasks;
  }): Promise<void> {
  for (const task of tasks) {
    if (task.type === "build") {
      throw new Error("runTaskQueue does not support build tasks");
    }

    await executeTask({ benchmark, outputDirectory, task });
  }
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

async function getRendererDependencyInfo(
  plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"],
): Promise<RendererDependencyInfo | undefined> {
  const send = createSend(plugins);

  if (!await send("htmlisp-renderer-plugin", { type: "ping", payload: undefined })) {
    return;
  }

  return await send("htmlisp-renderer-plugin", {
    type: "getComponentDependencyGraph",
    payload: undefined,
  }) as RendererDependencyInfo | undefined;
}

function getGlobalDependencyTasks(
  {
    plugins,
    prepareTasks,
    rendererDependencyInfo,
    routerTasks,
  }: {
    plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
    prepareTasks: Tasks;
    rendererDependencyInfo?: RendererDependencyInfo;
    routerTasks: Tasks;
  },
) {
  return prepareTasks
    .concat(routerTasks)
    .concat(
      plugins.flatMap(({ meta, moduleTasks = [], tasks }) =>
        meta.name === "htmlisp-renderer-plugin"
          ? moduleTasks.concat(rendererDependencyInfo?.globalDependencyTasks ?? tasks)
          : moduleTasks.concat(tasks)
      ),
    );
}

function getComponentDependencyTasks(
  rendererDependencyInfo: RendererDependencyInfo | undefined,
  layoutName: string,
) {
  return rendererDependencyInfo?.componentGraph[layoutName]?.dependencyTasks ?? [];
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

async function runBuildTasks(
  {
    benchmark,
    cwd,
    outputDirectory,
    incrementalCache,
    incrementalCacheSource,
    incrementalCacheEnabled,
    nextIncrementalCacheRoutes,
    globalDependencyTasks,
    rendererDependencyInfo,
    routeConcurrency,
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
    rendererDependencyInfo?: RendererDependencyInfo;
    routeConcurrency: number;
    router: {
      matchRoute(url: string): Promise<Route | undefined>;
    };
    plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
    tasks: Extract<Tasks[number], { type: "build" }>[];
  },
) {
  const globalFingerprint = globalDependencyTasks
    ? await hashDependencyTasks(cwd, globalDependencyTasks)
    : null;
  let cacheHits = 0;
  let routesBuilt = 0;

  await runWithConcurrency(tasks, routeConcurrency, async (task) => {
    const result = await processBuildTask({
      benchmark,
      cwd,
      globalFingerprint,
      incrementalCache,
      incrementalCacheEnabled,
      incrementalCacheSource,
      nextIncrementalCacheRoutes,
      outputDirectory,
      plugins,
      rendererDependencyInfo,
      router,
      task,
    });

    cacheHits += result.cacheHit ? 1 : 0;
    routesBuilt += result.routeBuilt ? 1 : 0;
  });

  return { cacheHits, nextIncrementalCacheRoutes, routesBuilt };
}

async function processBuildTask(
  {
    benchmark,
    cwd,
    globalFingerprint,
    incrementalCache,
    incrementalCacheEnabled,
    incrementalCacheSource,
    nextIncrementalCacheRoutes,
    outputDirectory,
    plugins,
    rendererDependencyInfo,
    router,
    task,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    cwd: string;
    globalFingerprint: string | null;
    incrementalCache?: IncrementalBuildCache;
    incrementalCacheEnabled: boolean;
    incrementalCacheSource?: NonNullable<Awaited<ReturnType<typeof readIncrementalBuildCache>>>["source"];
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
    outputDirectory: string;
    plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
    rendererDependencyInfo?: RendererDependencyInfo;
    router: {
      matchRoute(url: string): Promise<Route | undefined>;
    };
    task: Extract<Tasks[number], { type: "build" }>;
  },
) {
  DEBUG && console.log("node build - running task", task.type, task.payload.url);
  benchmark?.markTaskProcessed();

  const { result: matchedRoute, tasks: matchDependencyTasks } =
    await runWithTaskLog(() => router.matchRoute(task.payload.url));

  if (!matchedRoute) {
    throw new Error(`Failed to find route ${task.payload.url} while building`);
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
    return { cacheHit: true, routeBuilt: false };
  }

  if (previousRouteCache) {
    await clearCachedOutputs(outputDirectory, previousRouteCache.outputPaths);
  }

  const routeStartTime = performance.now();
  const { result: renderResult, tasks: renderDependencyTasks } =
    await runWithTaskLog(() =>
      applyPlugins({
        plugins,
        url: task.payload.url,
        route: matchedRoute,
        matchRoute(url: string) {
          return applyMatchRoutes({ plugins, url });
        },
      })
    );

  const dependencyTasks = normalizeDependencyTasks(
    matchDependencyTasks.concat(
      getComponentDependencyTasks(rendererDependencyInfo, matchedRoute.layout),
      renderDependencyTasks,
    ),
    cwd,
  );

  await runTaskQueue({
    benchmark,
    outputDirectory,
    tasks: renderResult.tasks,
  });

  const writeResult = await writeRenderedPage({
    dir: task.payload.dir,
    markup: renderResult.markup,
    outputDirectory,
    url: task.payload.url,
  });
  const outputPaths = [writeResult.outputPath].concat(
    getTaskOutputPaths(renderResult.tasks),
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

  benchmark?.recordRoute({
    bytesWritten: writeResult.bytesWritten,
    durationMs: performance.now() - routeStartTime,
    memoryRssBytes: process.memoryUsage().rss,
    outputPath: writeResult.outputPath,
    url: task.payload.url,
  });

  return { cacheHit: false, routeBuilt: true };
}

async function executeTask(
  {
    benchmark,
    outputDirectory,
    task,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    outputDirectory: string;
    task: Exclude<Tasks[number], { type: "build" }>;
  },
) {
  DEBUG && console.log("node build - running task", task.type);
  benchmark?.markTaskProcessed();

  switch (task.type) {
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

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
) {
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  let index = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (index < items.length) {
        const item = items[index++];
        await fn(item);
      }
    }),
  );
}

function getDefaultRouteConcurrency() {
  return Math.max(1, Math.min(8, availableParallelism() - 1));
}

export { buildNode };
export type { BuildBenchmark, BuildNodeResult };
