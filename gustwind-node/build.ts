import * as path from "node:path";
import { mkdir } from "node:fs/promises";
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
import {
  initLoadApi as initNodeLoadApi,
  stopModuleBundler,
} from "../load-adapters/node.ts";
import { createBuildBenchmark } from "../utilities/buildBenchmark.ts";
import { validateHtmlDirectory } from "../utilities/htmlValidation.ts";
import {
  CACHE_MANIFEST_PATH,
  clearCachedOutputs,
  hashDependencyTasks,
  hashRouteFingerprint,
  normalizeDependencyTasks,
  outputsExist,
  readIncrementalBuildCache,
  removeDeletedRouteOutputs,
  restoreCachedOutputs,
  writeIncrementalBuildCache,
} from "../utilities/incrementalBuildCache.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { runWithTaskLog } from "../utilities/taskLogContext.ts";
import { runWithConcurrency } from "../utilities/concurrency.ts";
import type { PluginOptions, Route, Tasks } from "../types.ts";
import type { BuildBenchmark } from "../utilities/buildBenchmark.ts";
import type { ComponentDependencyGraph } from "../utilities/componentDependencyGraph.ts";
import type {
  DependencyTask,
  IncrementalBuildCache,
  IncrementalBuildRouteCacheEntry,
} from "../utilities/incrementalBuildCache.ts";
import {
  acquireBuildLock,
  getDefaultRouteConcurrency,
  removeOutputDirectoryContents,
} from "./buildOutput.ts";
import { runTaskQueue, writeRenderedPage } from "./buildRenderOutput.ts";

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
type BuildTask = Extract<Tasks[number], { type: "build" }>;
type BuildPlugins = Awaited<ReturnType<typeof importPlugins>>["plugins"];
type BuildNodeOptions = {
  cwd: string;
  outputDirectory: string;
  pluginDefinitions: PluginOptions[];
  validateOutput?: boolean;
  collectBenchmark?: boolean;
  incremental?: boolean;
  cacheFrom?: string;
  routeConcurrency?: number;
};
type NormalizedBuildNodeOptions = Required<
  Pick<
    BuildNodeOptions,
    "collectBenchmark" | "incremental" | "routeConcurrency"
  >
> &
  Omit<
    BuildNodeOptions,
    "collectBenchmark" | "incremental" | "routeConcurrency"
  > & {
    cacheFrom: string;
    validateOutput: boolean;
  };
type BuildNodeRunConfig = NormalizedBuildNodeOptions & {
  preservesCurrentOutput: boolean;
  previousCache?: Awaited<ReturnType<typeof readIncrementalBuildCache>>;
};
type BuildInputs = Awaited<ReturnType<typeof loadBuildInputs>>;
type RestoreRouteBuildFromCacheOptions = {
  cwd: string;
  globalFingerprint: string | null;
  incrementalCache?: IncrementalBuildCache;
  incrementalCacheEnabled: boolean;
  incrementalCacheSource?: NonNullable<
    Awaited<ReturnType<typeof readIncrementalBuildCache>>
  >["source"];
  matchedRoute: Route;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  outputDirectory: string;
  url: string;
};
type RunBuildTasksOptions = {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  cwd: string;
  outputDirectory: string;
  incrementalCache?: IncrementalBuildCache;
  incrementalCacheSource?: NonNullable<
    Awaited<ReturnType<typeof readIncrementalBuildCache>>
  >["source"];
  incrementalCacheEnabled: boolean;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  globalDependencyTasks?: DependencyTask[];
  rendererDependencyInfo?: RendererDependencyInfo;
  routeConcurrency: number;
  router: {
    matchRoute(url: string): Promise<Route | undefined>;
  };
  plugins: BuildPlugins;
  tasks: BuildTask[];
};
type ProcessBuildTaskOptions = Omit<
  RunBuildTasksOptions,
  "globalDependencyTasks" | "routeConcurrency" | "tasks"
> & {
  globalFingerprint: string | null;
  task: BuildTask;
};
type ProcessBuildTaskResult = {
  cacheHit: boolean;
  routeBuilt: boolean;
};
type BuildRouteOutputOptions = {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  cwd: string;
  dir: string;
  globalFingerprint: string | null;
  incrementalCacheEnabled: boolean;
  matchDependencyTasks: Tasks;
  matchedRoute: Route;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  outputDirectory: string;
  plugins: BuildPlugins;
  rendererDependencyInfo?: RendererDependencyInfo;
  url: string;
};

async function buildNode(options: BuildNodeOptions): Promise<BuildNodeResult> {
  const config = await createBuildNodeRunConfig(options);
  const releaseBuildLock = await acquireBuildLock(config.outputDirectory);

  try {
    return await runNodeBuild(config);
  } finally {
    await releaseBuildLock();
    await stopModuleBundler();
  }
}

async function createBuildNodeRunConfig(
  options: BuildNodeOptions,
): Promise<BuildNodeRunConfig> {
  const collectBenchmark = shouldCollectBenchmark(options);
  const incremental = shouldUseIncrementalBuild(options, collectBenchmark);
  const cacheFrom = options.cacheFrom ?? options.outputDirectory;
  const previousCache = await readPreviousBuildCache(
    options.cwd,
    cacheFrom,
    incremental,
  );

  return {
    ...options,
    cacheFrom,
    collectBenchmark,
    incremental,
    previousCache,
    preservesCurrentOutput: preservesCurrentOutput(
      previousCache,
      options.cwd,
      options.outputDirectory,
    ),
    routeConcurrency: options.routeConcurrency ?? getDefaultRouteConcurrency(),
    validateOutput: options.validateOutput ?? false,
  };
}

function shouldCollectBenchmark(options: BuildNodeOptions) {
  return options.collectBenchmark ?? false;
}

function shouldUseIncrementalBuild(
  options: BuildNodeOptions,
  collectBenchmark: boolean,
) {
  return options.incremental ?? !collectBenchmark;
}

async function readPreviousBuildCache(
  cwd: string,
  cacheFrom: string,
  incremental: boolean,
) {
  return incremental
    ? await readIncrementalBuildCache(cwd, cacheFrom)
    : undefined;
}

function preservesCurrentOutput(
  previousCache: Awaited<ReturnType<typeof readIncrementalBuildCache>>,
  cwd: string,
  outputDirectory: string,
) {
  return (
    previousCache?.source.kind === "filesystem" &&
    path.resolve(previousCache.source.rootDirectory) ===
      path.resolve(cwd, outputDirectory)
  );
}

async function runNodeBuild(
  config: BuildNodeRunConfig,
): Promise<BuildNodeResult> {
  const benchmark = await prepareNodeBuild(config);
  const buildInputs = await loadBuildInputs(config);
  const nextIncrementalCacheRoutes: Record<
    string,
    IncrementalBuildRouteCacheEntry
  > = {};
  const routeBuildResult = await runNodeBuildTasks({
    benchmark,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  });

  await finishNodeBuild({
    benchmark,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  });

  return {
    benchmark: benchmark?.finish(),
    cacheHits: routeBuildResult.cacheHits,
    routesBuilt: routeBuildResult.routesBuilt,
    validation: config.validateOutput
      ? await validateHtmlDirectory(config.outputDirectory)
      : undefined,
  };
}

async function prepareNodeBuild(config: BuildNodeRunConfig) {
  await prepareBuildOutputDirectory({
    outputDirectory: config.outputDirectory,
    preservesCurrentOutput: config.preservesCurrentOutput,
  });

  return config.collectBenchmark
    ? createBuildBenchmark(config.outputDirectory)
    : undefined;
}

async function prepareBuildOutputDirectory({
  outputDirectory,
  preservesCurrentOutput,
}: {
  outputDirectory: string;
  preservesCurrentOutput: boolean;
}) {
  if (!preservesCurrentOutput) {
    await removeOutputDirectoryContents(outputDirectory);
  }

  await mkdir(outputDirectory, { recursive: true });
}

async function loadBuildInputs({
  cwd,
  outputDirectory,
  pluginDefinitions,
  routeConcurrency,
}: {
  cwd: string;
  outputDirectory: string;
  pluginDefinitions: PluginOptions[];
  routeConcurrency: number;
}) {
  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    initLoadApi: initNodeLoadApi,
    mode: "production",
  });
  const prepareTasks = await preparePlugins(plugins);
  const { routes, tasks: routerTasks } = await router.getAllRoutes({
    routeConcurrency,
  });

  if (!routes) {
    throw new Error("No routes found");
  }

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

  return {
    globalDependencyTasks,
    plugins,
    prepareTasks,
    rendererDependencyInfo,
    router,
    routerTasks,
    routes,
  };
}

async function runNodeBuildTasks({
  benchmark,
  buildInputs,
  config,
  nextIncrementalCacheRoutes,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  buildInputs: BuildInputs;
  config: BuildNodeRunConfig;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
}) {
  await removeDeletedOutputsWhenPreserving(config, buildInputs.routes);
  await runPrepareAndRouterTasks(benchmark, config, buildInputs);

  return await runCachedBuildTasks(
    benchmark,
    config,
    buildInputs,
    nextIncrementalCacheRoutes,
  );
}

async function removeDeletedOutputsWhenPreserving(
  config: BuildNodeRunConfig,
  routes: Record<string, Route>,
) {
  if (config.preservesCurrentOutput) {
    await removeDeletedRouteOutputs(
      config.outputDirectory,
      config.previousCache?.cache,
      Object.keys(routes).map(toRouteOutputUrl),
    );
  }
}

async function runPrepareAndRouterTasks(
  benchmark: ReturnType<typeof createBuildBenchmark> | undefined,
  config: BuildNodeRunConfig,
  buildInputs: BuildInputs,
) {
  await runTaskQueue({
    benchmark,
    outputDirectory: config.outputDirectory,
    tasks: buildInputs.prepareTasks.concat(buildInputs.routerTasks),
  });
}

async function runCachedBuildTasks(
  benchmark: ReturnType<typeof createBuildBenchmark> | undefined,
  config: BuildNodeRunConfig,
  buildInputs: BuildInputs,
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>,
) {
  const previousCache = getPreviousIncrementalCache(config);

  return await runBuildTasks({
    benchmark,
    cwd: config.cwd,
    outputDirectory: config.outputDirectory,
    incrementalCache: previousCache?.cache,
    incrementalCacheSource: previousCache?.source,
    incrementalCacheEnabled: config.incremental,
    nextIncrementalCacheRoutes,
    globalDependencyTasks: buildInputs.globalDependencyTasks,
    rendererDependencyInfo: buildInputs.rendererDependencyInfo,
    routeConcurrency: config.routeConcurrency,
    router: buildInputs.router,
    plugins: buildInputs.plugins,
    tasks: createRouteBuildTasks(buildInputs.routes, config.outputDirectory),
  });
}

function getPreviousIncrementalCache(config: BuildNodeRunConfig) {
  return config.incremental ? config.previousCache : undefined;
}

async function finishNodeBuild({
  benchmark,
  buildInputs,
  config,
  nextIncrementalCacheRoutes,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  buildInputs: BuildInputs;
  config: BuildNodeRunConfig;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
}) {
  await runTaskQueue({
    benchmark,
    outputDirectory: config.outputDirectory,
    tasks: await finishPlugins(buildInputs.plugins),
  });

  await cleanUpPlugins(buildInputs.plugins, buildInputs.routes);

  if (config.incremental) {
    await writeIncrementalBuildCache(
      config.outputDirectory,
      nextIncrementalCacheRoutes,
    );
  }
}

function createRouteBuildTasks(
  routes: Record<string, Route>,
  outputDirectory: string,
): BuildTask[] {
  return Object.entries(routes)
    .filter(([, route]) => Boolean(route.layout))
    .map(([url, route]) => ({
      type: "build" as const,
      payload: {
        route,
        dir: path.join(outputDirectory, url),
        url: toRouteOutputUrl(url),
      },
    }));
}

function toRouteOutputUrl(url: string) {
  return url === "/" ? "/" : "/" + url + "/";
}

async function getRendererDependencyInfo(
  plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"],
): Promise<RendererDependencyInfo | undefined> {
  const send = createSend(plugins);

  if (
    !(await send("htmlisp-renderer-plugin", {
      type: "ping",
      payload: undefined,
    }))
  ) {
    return;
  }

  return (await send("htmlisp-renderer-plugin", {
    type: "getComponentDependencyGraph",
    payload: undefined,
  })) as RendererDependencyInfo | undefined;
}

function getGlobalDependencyTasks({
  plugins,
  prepareTasks,
  rendererDependencyInfo,
  routerTasks,
}: {
  plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
  prepareTasks: Tasks;
  rendererDependencyInfo?: RendererDependencyInfo;
  routerTasks: Tasks;
}) {
  return prepareTasks
    .concat(routerTasks)
    .concat(
      plugins.flatMap(({ meta, moduleTasks = [], tasks }) =>
        meta.name === "htmlisp-renderer-plugin"
          ? moduleTasks.concat(
              rendererDependencyInfo?.globalDependencyTasks ?? tasks,
            )
          : moduleTasks.concat(tasks),
      ),
    );
}

function getComponentDependencyTasks(
  rendererDependencyInfo: RendererDependencyInfo | undefined,
  layoutName: string,
) {
  return (
    rendererDependencyInfo?.componentGraph[layoutName]?.dependencyTasks ?? []
  );
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

async function runBuildTasks({
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
}: RunBuildTasksOptions) {
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

async function processBuildTask({
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
}: ProcessBuildTaskOptions): Promise<ProcessBuildTaskResult> {
  DEBUG &&
    console.log("node build - running task", task.type, task.payload.url);
  benchmark?.markTaskProcessed();

  const routeBuildInput = await prepareRouteBuildInput(router, task);
  const cacheRestore = await restoreRouteBuildFromCache({
    cwd,
    globalFingerprint,
    incrementalCache,
    incrementalCacheEnabled,
    incrementalCacheSource,
    matchedRoute: routeBuildInput.matchedRoute,
    nextIncrementalCacheRoutes,
    outputDirectory,
    url: task.payload.url,
  });

  if (cacheRestore) {
    return { cacheHit: true, routeBuilt: false };
  }

  await buildRouteOutput({
    benchmark,
    cwd,
    dir: task.payload.dir,
    globalFingerprint,
    incrementalCacheEnabled,
    matchDependencyTasks: routeBuildInput.matchDependencyTasks,
    matchedRoute: routeBuildInput.matchedRoute,
    nextIncrementalCacheRoutes,
    outputDirectory,
    plugins,
    rendererDependencyInfo,
    url: task.payload.url,
  });

  return { cacheHit: false, routeBuilt: true };
}

async function prepareRouteBuildInput(
  router: ProcessBuildTaskOptions["router"],
  task: BuildTask,
) {
  const { result: matchedRoute, tasks: matchDependencyTasks } =
    await runWithTaskLog(() => router.matchRoute(task.payload.url));

  if (!matchedRoute) {
    throw new Error(`Failed to find route ${task.payload.url} while building`);
  }

  return { matchedRoute, matchDependencyTasks };
}

async function restoreRouteBuildFromCache({
  cwd,
  globalFingerprint,
  incrementalCache,
  incrementalCacheEnabled,
  incrementalCacheSource,
  matchedRoute,
  nextIncrementalCacheRoutes,
  outputDirectory,
  url,
}: RestoreRouteBuildFromCacheOptions) {
  const previousRouteCache = incrementalCache?.routes[url];

  if (!previousRouteCache) {
    return false;
  }

  const previousRouteFingerprint = await hashRouteFingerprint(
    cwd,
    globalFingerprint,
    matchedRoute,
    previousRouteCache.dependencyTasks,
  );

  if (
    incrementalCacheSource &&
    (await canRestoreCachedRoute({
      incrementalCacheEnabled,
      incrementalCacheSource,
      previousRouteCache,
      previousRouteFingerprint,
    }))
  ) {
    await restoreCachedOutputs(
      incrementalCacheSource,
      outputDirectory,
      previousRouteCache.outputPaths,
    );
    nextIncrementalCacheRoutes[url] = previousRouteCache;
    return true;
  }

  await clearCachedOutputs(outputDirectory, previousRouteCache.outputPaths);

  return false;
}

async function canRestoreCachedRoute({
  incrementalCacheEnabled,
  incrementalCacheSource,
  previousRouteCache,
  previousRouteFingerprint,
}: {
  incrementalCacheEnabled: boolean;
  incrementalCacheSource: NonNullable<
    RestoreRouteBuildFromCacheOptions["incrementalCacheSource"]
  >;
  previousRouteCache: IncrementalBuildRouteCacheEntry;
  previousRouteFingerprint: string | null;
}) {
  if (!incrementalCacheEnabled || !incrementalCacheSource) {
    return false;
  }

  if (previousRouteFingerprint !== previousRouteCache.fingerprint) {
    return false;
  }

  return outputsExist(incrementalCacheSource, previousRouteCache.outputPaths);
}

async function buildRouteOutput({
  benchmark,
  cwd,
  dir,
  globalFingerprint,
  incrementalCacheEnabled,
  matchDependencyTasks,
  matchedRoute,
  nextIncrementalCacheRoutes,
  outputDirectory,
  plugins,
  rendererDependencyInfo,
  url,
}: BuildRouteOutputOptions) {
  const routeStartTime = performance.now();
  const { renderResult, renderDependencyTasks } = await renderRoute({
    matchedRoute,
    plugins,
    url,
  });
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
    dir,
    markup: renderResult.markup,
    outputDirectory,
    url,
  });
  const outputPaths = getRouteOutputPaths(
    writeResult.outputPath,
    renderResult.tasks,
  );

  await updateRouteBuildCache({
    cwd,
    dependencyTasks,
    globalFingerprint,
    incrementalCacheEnabled,
    matchedRoute,
    nextIncrementalCacheRoutes,
    outputPaths,
    url,
  });

  recordRouteBenchmark({ benchmark, routeStartTime, url, writeResult });
}

async function renderRoute({
  matchedRoute,
  plugins,
  url,
}: {
  matchedRoute: Route;
  plugins: BuildPlugins;
  url: string;
}) {
  const { result: renderResult, tasks: renderDependencyTasks } =
    await runWithTaskLog(() =>
      applyPlugins({
        plugins,
        url,
        route: matchedRoute,
        matchRoute(routeUrl: string) {
          return applyMatchRoutes({ plugins, url: routeUrl });
        },
      }),
    );

  return { renderDependencyTasks, renderResult };
}

function getRouteOutputPaths(outputPath: string, tasks: Tasks) {
  return [outputPath]
    .concat(getTaskOutputPaths(tasks))
    .filter((outputPath) => outputPath !== CACHE_MANIFEST_PATH);
}

function recordRouteBenchmark({
  benchmark,
  routeStartTime,
  url,
  writeResult,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  routeStartTime: number;
  url: string;
  writeResult: Awaited<ReturnType<typeof writeRenderedPage>>;
}) {
  benchmark?.recordRoute({
    bytesWritten: writeResult.bytesWritten,
    durationMs: performance.now() - routeStartTime,
    memoryRssBytes: process.memoryUsage().rss,
    outputPath: writeResult.outputPath,
    url,
  });
}

async function updateRouteBuildCache({
  cwd,
  dependencyTasks,
  globalFingerprint,
  incrementalCacheEnabled,
  matchedRoute,
  nextIncrementalCacheRoutes,
  outputPaths,
  url,
}: {
  cwd: string;
  dependencyTasks: DependencyTask[];
  globalFingerprint: string | null;
  incrementalCacheEnabled: boolean;
  matchedRoute: Route;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  outputPaths: string[];
  url: string;
}) {
  if (!incrementalCacheEnabled) {
    return;
  }

  const fingerprint = await hashRouteFingerprint(
    cwd,
    globalFingerprint,
    matchedRoute,
    dependencyTasks,
  );

  if (fingerprint) {
    nextIncrementalCacheRoutes[url] = {
      dependencyTasks,
      fingerprint,
      outputPaths,
    };
  }
}

export { buildNode };
export type { BuildBenchmark, BuildNodeResult };
