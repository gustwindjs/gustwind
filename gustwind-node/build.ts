import { availableParallelism } from "node:os";
import * as path from "node:path";
import {
  cp,
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  unlink,
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
  toRelativeOutputPath,
  writeIncrementalBuildCache,
} from "../utilities/incrementalBuildCache.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { stripVoidElementClosers } from "../utilities/stripVoidElementClosers.ts";
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
type NormalizedBuildNodeOptions =
  & Required<
    Pick<
      BuildNodeOptions,
      "collectBenchmark" | "incremental" | "routeConcurrency"
    >
  >
  & Omit<
    BuildNodeOptions,
    "collectBenchmark" | "incremental" | "routeConcurrency"
  >
  & {
    cacheFrom: string;
    validateOutput: boolean;
  };
type BuildNodeRunConfig = NormalizedBuildNodeOptions & {
  preservesCurrentOutput: boolean;
  previousCache?: Awaited<ReturnType<typeof readIncrementalBuildCache>>;
};
type BuildInputs = Awaited<ReturnType<typeof loadBuildInputs>>;

async function buildNode(
  options: BuildNodeOptions,
): Promise<BuildNodeResult> {
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
  const collectBenchmark = options.collectBenchmark ?? false;
  const incremental = options.incremental ?? !collectBenchmark;
  const cacheFrom = options.cacheFrom ?? options.outputDirectory;
  const previousCache = incremental
    ? await readIncrementalBuildCache(options.cwd, cacheFrom)
    : undefined;

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

function preservesCurrentOutput(
  previousCache: Awaited<ReturnType<typeof readIncrementalBuildCache>>,
  cwd: string,
  outputDirectory: string,
) {
  return previousCache?.source.kind === "filesystem" &&
    path.resolve(previousCache.source.rootDirectory) ===
      path.resolve(cwd, outputDirectory);
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

async function prepareBuildOutputDirectory(
  {
    outputDirectory,
    preservesCurrentOutput,
  }: {
    outputDirectory: string;
    preservesCurrentOutput: boolean;
  },
) {
  if (!preservesCurrentOutput) {
    await removeOutputDirectoryContents(outputDirectory);
  }

  await mkdir(outputDirectory, { recursive: true });
}

async function loadBuildInputs(
  {
    cwd,
    outputDirectory,
    pluginDefinitions,
    routeConcurrency,
  }: {
    cwd: string;
    outputDirectory: string;
    pluginDefinitions: PluginOptions[];
    routeConcurrency: number;
  },
) {
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

async function runNodeBuildTasks(
  {
    benchmark,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    buildInputs: BuildInputs;
    config: BuildNodeRunConfig;
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  },
) {
  if (config.preservesCurrentOutput) {
    await removeDeletedRouteOutputs(
      config.outputDirectory,
      config.previousCache?.cache,
      Object.keys(buildInputs.routes).map(toRouteOutputUrl),
    );
  }

  await runTaskQueue({
    benchmark,
    outputDirectory: config.outputDirectory,
    tasks: buildInputs.prepareTasks.concat(buildInputs.routerTasks),
  });

  return await runBuildTasks({
    benchmark,
    cwd: config.cwd,
    outputDirectory: config.outputDirectory,
    incrementalCache: config.incremental
      ? config.previousCache?.cache
      : undefined,
    incrementalCacheSource: config.incremental
      ? config.previousCache?.source
      : undefined,
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

async function finishNodeBuild(
  {
    benchmark,
    buildInputs,
    config,
    nextIncrementalCacheRoutes,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    buildInputs: BuildInputs;
    config: BuildNodeRunConfig;
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  },
) {
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

async function runTaskQueue(
  {
    benchmark,
    outputDirectory,
    tasks,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    outputDirectory: string;
    tasks: Tasks;
  },
): Promise<void> {
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

  if (
    !await send("htmlisp-renderer-plugin", { type: "ping", payload: undefined })
  ) {
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
          ? moduleTasks.concat(
            rendererDependencyInfo?.globalDependencyTasks ?? tasks,
          )
          : moduleTasks.concat(tasks)
      ),
    );
}

function getComponentDependencyTasks(
  rendererDependencyInfo: RendererDependencyInfo | undefined,
  layoutName: string,
) {
  return rendererDependencyInfo?.componentGraph[layoutName]?.dependencyTasks ??
    [];
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
    incrementalCacheSource?: NonNullable<
      Awaited<ReturnType<typeof readIncrementalBuildCache>>
    >["source"];
    nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
    outputDirectory: string;
    plugins: BuildPlugins;
    rendererDependencyInfo?: RendererDependencyInfo;
    router: {
      matchRoute(url: string): Promise<Route | undefined>;
    };
    task: BuildTask;
  },
) {
  DEBUG &&
    console.log("node build - running task", task.type, task.payload.url);
  benchmark?.markTaskProcessed();

  const { result: matchedRoute, tasks: matchDependencyTasks } =
    await runWithTaskLog(() => router.matchRoute(task.payload.url));

  if (!matchedRoute) {
    throw new Error(`Failed to find route ${task.payload.url} while building`);
  }

  const cacheRestore = await restoreRouteBuildFromCache({
    cwd,
    globalFingerprint,
    incrementalCache,
    incrementalCacheEnabled,
    incrementalCacheSource,
    matchedRoute,
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
    matchDependencyTasks,
    matchedRoute,
    nextIncrementalCacheRoutes,
    outputDirectory,
    plugins,
    rendererDependencyInfo,
    url: task.payload.url,
  });

  return { cacheHit: false, routeBuilt: true };
}

async function restoreRouteBuildFromCache(
  {
    cwd,
    globalFingerprint,
    incrementalCache,
    incrementalCacheEnabled,
    incrementalCacheSource,
    matchedRoute,
    nextIncrementalCacheRoutes,
    outputDirectory,
    url,
  }: {
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
  },
) {
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
    incrementalCacheEnabled &&
    incrementalCacheSource &&
    previousRouteFingerprint === previousRouteCache.fingerprint &&
    await outputsExist(incrementalCacheSource, previousRouteCache.outputPaths)
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

async function buildRouteOutput(
  {
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
  }: {
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
  },
) {
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

async function renderRoute(
  {
    matchedRoute,
    plugins,
    url,
  }: {
    matchedRoute: Route;
    plugins: BuildPlugins;
    url: string;
  },
) {
  const { result: renderResult, tasks: renderDependencyTasks } =
    await runWithTaskLog(() =>
      applyPlugins({
        plugins,
        url,
        route: matchedRoute,
        matchRoute(routeUrl: string) {
          return applyMatchRoutes({ plugins, url: routeUrl });
        },
      })
    );

  return { renderDependencyTasks, renderResult };
}

function getRouteOutputPaths(outputPath: string, tasks: Tasks) {
  return [outputPath].concat(
    getTaskOutputPaths(tasks),
  ).filter((outputPath) => outputPath !== CACHE_MANIFEST_PATH);
}

function recordRouteBenchmark(
  {
    benchmark,
    routeStartTime,
    url,
    writeResult,
  }: {
    benchmark?: ReturnType<typeof createBuildBenchmark>;
    routeStartTime: number;
    url: string;
    writeResult: Awaited<ReturnType<typeof writeRenderedPage>>;
  },
) {
  benchmark?.recordRoute({
    bytesWritten: writeResult.bytesWritten,
    durationMs: performance.now() - routeStartTime,
    memoryRssBytes: process.memoryUsage().rss,
    outputPath: writeResult.outputPath,
    url,
  });
}

async function updateRouteBuildCache(
  {
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
  },
) {
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

  if (isWriteTask(task)) {
    await executeWriteTask(task.payload);
    return;
  }

  if (task.type === "copyFiles") {
    await executeCopyTask(task.payload);
    return;
  }

  if (isReadOnlyTask(task)) {
    return;
  }

  const _exhaustive: never = task;
  throw new Error(`Unsupported build task ${_exhaustive}`);
}

function isWriteTask(
  task: Exclude<Tasks[number], { type: "build" }>,
): task is Extract<Tasks[number], { type: "writeFile" | "writeTextFile" }> {
  return task.type === "writeFile" || task.type === "writeTextFile";
}

function isReadOnlyTask(
  task: Exclude<Tasks[number], { type: "build" }>,
): task is Extract<
  Tasks[number],
  {
    type: "loadJSON" | "loadModule" | "listDirectory" | "readTextFile" | "init";
  }
> {
  return task.type === "loadJSON" ||
    task.type === "loadModule" ||
    task.type === "listDirectory" ||
    task.type === "readTextFile" ||
    task.type === "init";
}

async function executeWriteTask(
  payload: Extract<
    Tasks[number],
    { type: "writeFile" | "writeTextFile" }
  >["payload"],
) {
  if (payload.outputDirectory.endsWith(".html")) {
    return;
  }

  const filePath = path.join(payload.outputDirectory, payload.file);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, payload.data);
}

async function executeCopyTask(
  payload: Extract<Tasks[number], { type: "copyFiles" }>["payload"],
) {
  await cp(
    payload.inputDirectory,
    path.join(payload.outputDirectory, payload.outputPath),
    { force: true, recursive: true },
  );
}

function getDefaultRouteConcurrency() {
  return Math.max(1, availableParallelism() - 1);
}

async function removeOutputDirectory(outputDirectory: string) {
  const retryableErrors = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await rm(outputDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error instanceof Error && "code" in error
        ? String(error.code)
        : "";

      if (!retryableErrors.has(code) || attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

async function removeOutputDirectoryContents(outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });

  let entries: { name: string }[];

  try {
    entries = await readdir(outputDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(entries.map(async (entry) => {
    if (entry.name === ".gustwind") {
      return;
    }

    await removeOutputDirectory(path.join(outputDirectory, entry.name));
  }));
}

async function acquireBuildLock(outputDirectory: string) {
  const lockDirectory = path.join(outputDirectory, ".gustwind");
  const lockPath = path.join(lockDirectory, "build.lock");

  await mkdir(lockDirectory, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await open(lockPath, "wx");

      await handle.writeFile(
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
        }) + "\n",
      );
      await handle.close();

      return async () => {
        await unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }

      if (await removeStaleBuildLock(lockPath)) {
        continue;
      }

      throw new Error(
        `Another Gustwind build is already using ${outputDirectory}. ` +
          `Remove ${lockPath} if that build is no longer running.`,
      );
    }
  }

  throw new Error(`Failed to acquire Gustwind build lock at ${lockPath}`);
}

async function removeStaleBuildLock(lockPath: string) {
  let parsed: { pid?: unknown };

  try {
    parsed = JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return false;
  }

  if (typeof parsed.pid !== "number" || isProcessRunning(parsed.pid)) {
    return false;
  }

  await unlink(lockPath).catch(() => undefined);

  return true;
}

function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && "code" in error &&
      error.code === "ESRCH");
  }
}

function isFileExistsError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

export { buildNode };
export type { BuildBenchmark, BuildNodeResult };
