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
  hashDependencyTasks,
  normalizeDependencyTasks,
  readIncrementalBuildCache,
  removeDeletedRouteOutputs,
  writeIncrementalBuildCache,
} from "../utilities/incrementalBuildCache.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { runWithTaskLog } from "../utilities/taskLogContext.ts";
import { runWithConcurrency } from "../utilities/concurrency.ts";
import type {
  BuildDiagnostics,
  PluginOptions,
  Route,
  Tasks,
} from "../types.ts";
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
import {
  restoreRouteBuildFromCache,
  updateRouteBuildCache,
} from "./buildRouteCache.ts";

const DEBUG = isDebugEnabled();
type BuildNodeResult = {
  benchmark?: BuildBenchmark;
  cacheFrom?: string;
  cacheHits?: number;
  routesBuilt?: number;
  validation?: Awaited<ReturnType<typeof validateHtmlDirectory>>;
};
type BuildProgressEvent = {
  cacheHits: number;
  completedRoutes: number;
  routesBuilt: number;
  status: "rebuilt" | "reused";
  totalRoutes: number;
  url: string;
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
  onProgress?: (event: BuildProgressEvent) => void;
  routeConcurrency?: number;
  memoizeDataSources?: boolean;
};
type NormalizedBuildNodeOptions = Required<
  Pick<
    BuildNodeOptions,
    "collectBenchmark" | "incremental" | "memoizeDataSources" | "routeConcurrency"
  >
> &
  Omit<
    BuildNodeOptions,
    "collectBenchmark" | "incremental" | "memoizeDataSources" | "routeConcurrency"
  > & {
    cacheFrom: string;
    validateOutput: boolean;
  };
type BuildNodeRunConfig = NormalizedBuildNodeOptions & {
  preservesCurrentOutput: boolean;
  previousCache?: Awaited<ReturnType<typeof readIncrementalBuildCache>>;
};
type BuildInputs = Awaited<ReturnType<typeof loadBuildInputs>>;
type RunBuildTasksOptions = {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  buildDiagnostics?: BuildDiagnostics;
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
  onProgress?: (event: BuildProgressEvent) => void;
  routeConcurrency: number;
  router: {
    matchRoute(
      url: string,
      buildDiagnostics?: BuildDiagnostics,
    ): Promise<Route | undefined>;
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
  buildDiagnostics?: BuildDiagnostics;
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
    memoizeDataSources: options.memoizeDataSources ?? false,
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
  const buildDiagnostics = createBuildDiagnostics(config, benchmark);
  const buildInputs = await loadBuildInputs(config, benchmark, buildDiagnostics);
  const nextIncrementalCacheRoutes: Record<
    string,
    IncrementalBuildRouteCacheEntry
  > = {};
  const routeBuildResult = await runNodeBuildTasks({
    benchmark,
    buildDiagnostics,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  });

  await finishNodeBuild({
    benchmark,
    buildDiagnostics,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  });

  return {
    benchmark: benchmark?.finish(),
    cacheHits: routeBuildResult.cacheHits,
    routesBuilt: routeBuildResult.routesBuilt,
    validation: config.validateOutput
      ? await timeBuildPhase(benchmark, "validation", () =>
        validateHtmlDirectory(config.outputDirectory)
      )
      : undefined,
  };
}

function createBuildDiagnostics(
  config: BuildNodeRunConfig,
  benchmark: ReturnType<typeof createBuildBenchmark> | undefined,
): BuildDiagnostics | undefined {
  if (!benchmark && !config.memoizeDataSources) {
    return;
  }

  return {
    dataSourceCache: config.memoizeDataSources ? new Map() : undefined,
    recordComponentRender: benchmark?.recordComponentRender,
    recordDataSourceCall: benchmark?.recordDataSourceCall,
  };
}

async function timeBuildPhase<T>(
  benchmark: ReturnType<typeof createBuildBenchmark> | undefined,
  name: string,
  fn: () => Promise<T>,
) {
  return benchmark ? await benchmark.timePhase(name, fn) : await fn();
}

async function prepareNodeBuild(config: BuildNodeRunConfig) {
  const benchmark = config.collectBenchmark
    ? createBuildBenchmark(config.outputDirectory)
    : undefined;

  await timeBuildPhase(benchmark, "prepareOutputDirectory", () =>
    prepareBuildOutputDirectory({
      outputDirectory: config.outputDirectory,
      preservesCurrentOutput: config.preservesCurrentOutput,
    })
  );

  return benchmark;
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
}, benchmark?: ReturnType<typeof createBuildBenchmark>, buildDiagnostics?: BuildDiagnostics) {
  const { plugins, router } = await timeBuildPhase(benchmark, "importPlugins", () =>
    importPlugins({
      cwd,
      pluginDefinitions,
      outputDirectory,
      initLoadApi: initNodeLoadApi,
      mode: "production",
    })
  );
  const prepareTasks = await timeBuildPhase(benchmark, "preparePlugins", () =>
    preparePlugins(plugins)
  );
  const { routes, tasks: routerTasks } = await timeBuildPhase(
    benchmark,
    "routingExpansion",
    () =>
      router.getAllRoutes({
        buildDiagnostics,
        routeConcurrency,
      }),
  );

  if (!routes) {
    throw new Error("No routes found");
  }

  const rendererDependencyInfo = await timeBuildPhase(
    benchmark,
    "rendererDependencyInfo",
    () => getRendererDependencyInfo(plugins),
  );
  const globalDependencyTasks = await timeBuildPhase(
    benchmark,
    "dependencyNormalization",
    async () =>
      normalizeDependencyTasks(
        getGlobalDependencyTasks({
          plugins,
          prepareTasks,
          rendererDependencyInfo,
          routerTasks,
        }),
        cwd,
      ),
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
  buildDiagnostics,
  buildInputs,
  config,
  nextIncrementalCacheRoutes,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  buildDiagnostics?: BuildDiagnostics;
  buildInputs: BuildInputs;
  config: BuildNodeRunConfig;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
}) {
  await removeDeletedOutputsWhenPreserving(config, buildInputs.routes);
  await runPrepareAndRouterTasks(benchmark, config, buildInputs);

  return await runCachedBuildTasks(
    benchmark,
    buildDiagnostics,
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
  buildDiagnostics: BuildDiagnostics | undefined,
  config: BuildNodeRunConfig,
  buildInputs: BuildInputs,
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>,
) {
  const previousCache = getPreviousIncrementalCache(config);

  return await runBuildTasks({
    benchmark,
    buildDiagnostics,
    cwd: config.cwd,
    outputDirectory: config.outputDirectory,
    incrementalCache: previousCache?.cache,
    incrementalCacheSource: previousCache?.source,
    incrementalCacheEnabled: config.incremental,
    nextIncrementalCacheRoutes,
    globalDependencyTasks: buildInputs.globalDependencyTasks,
    rendererDependencyInfo: buildInputs.rendererDependencyInfo,
    onProgress: config.onProgress,
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
  buildDiagnostics: _buildDiagnostics,
  buildInputs,
  config,
  nextIncrementalCacheRoutes,
}: {
  benchmark?: ReturnType<typeof createBuildBenchmark>;
  buildDiagnostics?: BuildDiagnostics;
  buildInputs: BuildInputs;
  config: BuildNodeRunConfig;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
}) {
  await timeBuildPhase(benchmark, "finishPlugins", async () =>
    runTaskQueue({
      benchmark,
      outputDirectory: config.outputDirectory,
      tasks: await finishPlugins(buildInputs.plugins),
    })
  );

  await timeBuildPhase(benchmark, "cleanupPlugins", () =>
    cleanUpPlugins(buildInputs.plugins, buildInputs.routes)
  );

  if (config.incremental) {
    await timeBuildPhase(
      benchmark,
      "writeIncrementalCache",
      () =>
        writeIncrementalBuildCache(
          config.outputDirectory,
          nextIncrementalCacheRoutes,
        ),
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
  buildDiagnostics,
  cwd,
  outputDirectory,
  incrementalCache,
  incrementalCacheSource,
  incrementalCacheEnabled,
  nextIncrementalCacheRoutes,
  globalDependencyTasks,
  rendererDependencyInfo,
  onProgress,
  routeConcurrency,
  router,
  plugins,
  tasks,
}: RunBuildTasksOptions) {
  const globalFingerprint = globalDependencyTasks
    ? await timeBuildPhase(benchmark, "globalDependencyHash", () =>
      hashDependencyTasks(cwd, globalDependencyTasks)
    )
    : null;
  let cacheHits = 0;
  let routesBuilt = 0;

  await runWithConcurrency(tasks, routeConcurrency, async (task) => {
    const result = await processBuildTask({
      benchmark,
      buildDiagnostics,
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

    onProgress?.({
      cacheHits,
      completedRoutes: cacheHits + routesBuilt,
      routesBuilt,
      status: result.cacheHit ? "reused" : "rebuilt",
      totalRoutes: tasks.length,
      url: task.payload.url,
    });
  });

  return { cacheHits, nextIncrementalCacheRoutes, routesBuilt };
}

async function processBuildTask({
  benchmark,
  buildDiagnostics,
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

  const routeBuildInput = await prepareRouteBuildInput(
    router,
    task,
    benchmark,
    buildDiagnostics,
  );
  const cacheRestore = await timeBuildPhase(benchmark, "cacheRestore", () =>
    restoreRouteBuildFromCache({
      cwd,
      globalFingerprint,
      incrementalCache,
      incrementalCacheEnabled,
      incrementalCacheSource,
      matchedRoute: routeBuildInput.matchedRoute,
      nextIncrementalCacheRoutes,
      outputDirectory,
      url: task.payload.url,
    })
  );

  if (cacheRestore) {
    return { cacheHit: true, routeBuilt: false };
  }

  await buildRouteOutput({
    benchmark,
    buildDiagnostics,
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
  benchmark?: ReturnType<typeof createBuildBenchmark>,
  buildDiagnostics?: BuildDiagnostics,
) {
  const { result: matchedRoute, tasks: matchDependencyTasks } =
    await timeBuildPhase(benchmark, "routeMatch", () =>
      runWithTaskLog(() =>
        router.matchRoute(task.payload.url, buildDiagnostics)
      )
    );

  if (!matchedRoute) {
    throw new Error(`Failed to find route ${task.payload.url} while building`);
  }

  return { matchedRoute, matchDependencyTasks };
}

async function buildRouteOutput({
  benchmark,
  buildDiagnostics,
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
  const { renderResult, renderDependencyTasks } = await timeBuildPhase(
    benchmark,
    "routeRender",
    () =>
      renderRoute({
        buildDiagnostics,
        matchedRoute,
        plugins,
        url,
      }),
  );
  const dependencyTasks = await timeBuildPhase(
    benchmark,
    "routeDependencyNormalization",
    async () =>
      normalizeDependencyTasks(
        matchDependencyTasks.concat(
          getComponentDependencyTasks(rendererDependencyInfo, matchedRoute.layout),
          renderDependencyTasks,
        ),
        cwd,
      ),
  );

  await timeBuildPhase(benchmark, "renderTasks", () =>
    runTaskQueue({
      benchmark,
      outputDirectory,
      tasks: renderResult.tasks,
    })
  );

  const writeResult = await timeBuildPhase(benchmark, "writeFiles", () =>
    writeRenderedPage({
      dir,
      markup: renderResult.markup,
      outputDirectory,
      url,
    })
  );
  const outputPaths = getRouteOutputPaths(
    writeResult.outputPath,
    renderResult.tasks,
  );

  await timeBuildPhase(benchmark, "cacheUpdate", () =>
    updateRouteBuildCache({
      cwd,
      dependencyTasks,
      globalFingerprint,
      incrementalCacheEnabled,
      matchedRoute,
      nextIncrementalCacheRoutes,
      outputPaths,
      url,
    })
  );

  recordRouteBenchmark({ benchmark, routeStartTime, url, writeResult });
}

async function renderRoute({
  buildDiagnostics,
  matchedRoute,
  plugins,
  url,
}: {
  buildDiagnostics?: BuildDiagnostics;
  matchedRoute: Route;
  plugins: BuildPlugins;
  url: string;
}) {
  const { result: renderResult, tasks: renderDependencyTasks } =
    await runWithTaskLog(() =>
      applyPlugins({
        buildDiagnostics,
        plugins,
        url,
        route: matchedRoute,
        matchRoute(routeUrl: string) {
          return applyMatchRoutes({
            buildDiagnostics,
            plugins,
            url: routeUrl,
          }) as Promise<Route | undefined>;
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

export { buildNode };
export type { BuildBenchmark, BuildNodeResult, BuildProgressEvent };
