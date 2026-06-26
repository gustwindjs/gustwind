import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import {
  applyMatchRoutes,
  applyPlugins,
  cleanUpPlugins,
  finishPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { evaluateTasks } from "../gustwind-dev-server/evaluateTasks.ts";
import { initDevLoadApi, stopModuleBundler } from "../load-adapters/node.ts";
import type { BuildWorkerEvent, PluginOptions } from "../types.ts";
import { contentType } from "../utilities/contentType.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { stripVoidElementClosers } from "../utilities/stripVoidElementClosers.ts";
import {
  createServer as createViteServer,
  type Plugin,
  type ViteDevServer,
} from "vite";

const DEBUG = isDebugEnabled();

type DevServer = {
  close(): Promise<void>;
  port: number;
  url: string;
};

type ActiveRuntime = Awaited<ReturnType<typeof loadRuntime>>;
type PluginDefinitionsSource =
  | PluginOptions[]
  | (() => PluginOptions[] | Promise<PluginOptions[]>);
type DevServerState = {
  closed: boolean;
  reloadPromise: Promise<void>;
  runtime: ActiveRuntime;
};
type DevServerOptions = {
  cwd: string;
  pluginDefinitions: PluginDefinitionsSource;
  port?: number;
  host?: string;
  watchPaths?: string[];
};

async function startDevServer(options: DevServerOptions): Promise<DevServer> {
  const {
    cwd,
    pluginDefinitions,
    port = 3000,
    host = "127.0.0.1",
    watchPaths = [],
  } = options;
  const watchedPaths = new Set<string>();
  const state: DevServerState = {
    closed: false,
    reloadPromise: Promise.resolve(),
    runtime: await loadRuntime({ cwd, pluginDefinitions }),
  };
  let requestHandler:
    | ((req: IncomingMessage, res: ServerResponse) => void)
    | undefined;
  const httpServer = createHttpServer((req, res) => {
    requestHandler?.(req, res);
  });
  const vite = await createViteServer({
    appType: "custom",
    root: cwd,
    plugins: [
      createRuntimeReloadPlugin({
        cwd,
        watchedPaths,
        getClosed: () => state.closed,
        getState: () => state.runtime,
        loadRuntime: () => loadRuntime({ cwd, pluginDefinitions }),
        setReloadPromise(nextReloadPromise) {
          state.reloadPromise = nextReloadPromise;
        },
        getReloadPromise: () => state.reloadPromise,
        setState(nextRuntime) {
          state.runtime = nextRuntime;
        },
      }),
    ],
    server: {
      host,
      hmr: {
        host,
        server: httpServer,
      },
      middlewareMode: true,
    },
  });

  await watchTasks(vite, watchedPaths, state.runtime.initialTasks);
  await addWatchPaths(vite, watchedPaths, watchPaths);

  registerDevMiddleware({ reqState: state, vite, watchedPaths });

  requestHandler = vite.middlewares;

  await listenHttpServer({ host, httpServer, port });
  const address = httpServer.address();
  const listeningPort =
    typeof address === "object" && address ? address.port : port;

  return {
    async close() {
      if (state.closed) {
        return;
      }

      state.closed = true;
      await state.reloadPromise;
      await cleanUpPlugins(state.runtime.plugins, state.runtime.routes);
      await stopModuleBundler();
      await vite.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
    port: listeningPort,
    url: `http://${host}:${listeningPort}/`,
  };
}

function registerDevMiddleware({
  reqState,
  vite,
  watchedPaths,
}: {
  reqState: DevServerState;
  vite: ViteDevServer;
  watchedPaths: Set<string>;
}) {
  vite.middlewares.use(async (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }

    try {
      const handled = await handleRequest({
        vite,
        req,
        res,
        state: reqState.runtime,
        watchTasks(tasks) {
          return watchTasks(vite, watchedPaths, tasks);
        },
      });

      if (!handled) {
        next();
      }
    } catch (error) {
      if (error instanceof Error) {
        vite.ssrFixStacktrace(error);
      }

      next(error);
    }
  });
}

async function listenHttpServer({
  host,
  httpServer,
  port,
}: {
  host: string;
  httpServer: ReturnType<typeof createHttpServer>;
  port: number;
}) {
  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
}

async function handleRequest({
  vite,
  req,
  res,
  state,
  watchTasks,
}: {
  vite: ViteDevServer;
  req: IncomingMessage;
  res: ServerResponse;
  state: ActiveRuntime;
  watchTasks(tasks: BuildWorkerEvent[]): Promise<void>;
}) {
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  const routeHandled = await handleRouteRequest({
    pathname,
    res,
    state,
    vite,
    watchTasks,
  });

  if (routeHandled) {
    return true;
  }

  const assetHandled = await handleGeneratedAssetRequest({
    pathname,
    res,
    state,
    watchTasks,
  });

  if (assetHandled) {
    return true;
  }

  sendNotFoundResponse(res, pathname, state);

  return true;
}

async function handleRouteRequest({
  pathname,
  res,
  state,
  vite,
  watchTasks,
}: {
  pathname: string;
  res: ServerResponse;
  state: ActiveRuntime;
  vite: ViteDevServer;
  watchTasks(tasks: BuildWorkerEvent[]): Promise<void>;
}) {
  const matchedRoute = await state.router.matchRoute(pathname);

  if (!matchedRoute) {
    return false;
  }

  const { markup, tasks } = await applyPlugins({
    plugins: state.plugins,
    url: pathname,
    route: matchedRoute,
    matchRoute(url: string) {
      return applyMatchRoutes({ plugins: state.plugins, url });
    },
  });

  state.pathFs = await evaluateTasks(tasks);
  await watchTasks(tasks);

  sendResponse(
    res,
    200,
    await createRoutePayload({ markup, pathname, vite }),
    pathname.endsWith(".xml") ? contentType(".xml") : contentType(".html"),
  );

  return true;
}

async function createRoutePayload({
  markup,
  pathname,
  vite,
}: {
  markup: string;
  pathname: string;
  vite: ViteDevServer;
}) {
  return pathname.endsWith(".xml")
    ? markup
    : await vite.transformIndexHtml(pathname, stripVoidElementClosers(markup));
}

async function handleGeneratedAssetRequest({
  pathname,
  res,
  state,
  watchTasks,
}: {
  pathname: string;
  res: ServerResponse;
  state: ActiveRuntime;
  watchTasks(tasks: BuildWorkerEvent[]): Promise<void>;
}) {
  const prepareTasks = await preparePlugins(state.plugins);
  const finishTasks = await finishPlugins(state.plugins);
  const taskResults = await evaluateTasks(prepareTasks.concat(finishTasks));
  const matchedFsItem = taskResults[pathname] || state.pathFs[pathname];

  await watchTasks(prepareTasks.concat(finishTasks));

  if (!matchedFsItem) {
    return false;
  }

  if (matchedFsItem.type === "file") {
    sendResponse(
      res,
      200,
      matchedFsItem.data,
      contentType(path.extname(pathname)),
    );
    return true;
  }

  const asset = await readFile(matchedFsItem.path);
  sendResponse(res, 200, asset, contentType(path.extname(matchedFsItem.path)));

  return true;
}

function sendNotFoundResponse(
  res: ServerResponse,
  pathname: string,
  state: ActiveRuntime,
) {
  sendResponse(
    res,
    404,
    `No matching route in ${Object.keys(state.routes).join(", ")}.`,
    contentType(".txt"),
  );
}

async function loadRuntime({
  cwd,
  pluginDefinitions,
}: {
  cwd: string;
  pluginDefinitions: PluginDefinitionsSource;
}) {
  const resolvedPluginDefinitions =
    await resolvePluginDefinitions(pluginDefinitions);
  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions: resolvedPluginDefinitions,
    initLoadApi: initDevLoadApi,
    mode: "development",
    outputDirectory: "",
  });
  const prepareTasks = await preparePlugins(plugins);
  const { routes, tasks } = await router.getAllRoutes();
  const pathFs = await evaluateTasks(prepareTasks);

  return {
    initialTasks: prepareTasks.concat(tasks),
    pathFs,
    plugins,
    router,
    routes,
  };
}

async function watchTasks(
  vite: ViteDevServer,
  watchedPaths: Set<string>,
  tasks: BuildWorkerEvent[],
) {
  await addWatchPaths(vite, watchedPaths, collectWatchPaths(tasks));
}

async function addWatchPaths(
  vite: ViteDevServer,
  watchedPaths: Set<string>,
  pathsToWatch: string[],
) {
  const nextPaths = pathsToWatch.filter((watchPath) => {
    if (watchedPaths.has(watchPath)) {
      return false;
    }

    watchedPaths.add(watchPath);
    return true;
  });

  if (nextPaths.length === 0) {
    return;
  }

  await vite.watcher.add(nextPaths);
  DEBUG && console.log("gustwind-node - watching", nextPaths);
}

function createRuntimeReloadPlugin({
  cwd,
  watchedPaths,
  getClosed,
  getState,
  loadRuntime,
  setReloadPromise,
  getReloadPromise,
  setState,
}: {
  cwd: string;
  watchedPaths: Set<string>;
  getClosed(): boolean;
  getState(): ActiveRuntime;
  loadRuntime(): Promise<ActiveRuntime>;
  setReloadPromise(reloadPromise: Promise<void>): void;
  getReloadPromise(): Promise<void>;
  setState(state: ActiveRuntime): void;
}): Plugin {
  return {
    name: "gustwind-runtime-reload",
    async handleHotUpdate({ file, server }) {
      if (getClosed() || shouldIgnoreWatchPath(file)) {
        return [];
      }

      const reloadPromise = getReloadPromise().then(async () => {
        if (getClosed()) {
          return;
        }

        try {
          const nextState = await loadRuntime();
          await watchTasks(server, watchedPaths, nextState.initialTasks);
          const previousState = getState();
          setState(nextState);
          await cleanUpPlugins(previousState.plugins, previousState.routes);
          server.ws.send({ type: "full-reload" });
          DEBUG && console.log("gustwind-node - reloaded after", file);
        } catch (error) {
          console.error("Failed to reload Node development runtime", error);
        }
      });

      setReloadPromise(reloadPromise);
      await reloadPromise;

      return [];
    },
  };
}

function collectWatchPaths(tasks: BuildWorkerEvent[]) {
  return tasks
    .flatMap(getWatchPath)
    .filter(
      (watchPath): watchPath is string =>
        Boolean(watchPath) && !shouldIgnoreWatchPath(watchPath),
    );
}

function getWatchPath({ type, payload }: BuildWorkerEvent) {
  switch (type) {
    case "copyFiles":
      return payload.inputDirectory;
    case "listDirectory":
    case "loadJSON":
    case "loadModule":
    case "readTextFile":
      return payload.path;
    default:
      return [];
  }
}

function shouldIgnoreWatchPath(filePath: string) {
  return filePath.startsWith("http://") || filePath.startsWith("https://");
}

async function resolvePluginDefinitions(
  pluginDefinitions: PluginDefinitionsSource,
) {
  return typeof pluginDefinitions === "function"
    ? await pluginDefinitions()
    : pluginDefinitions;
}

function sendResponse(
  res: ServerResponse,
  status: number,
  body: string | Uint8Array,
  type: string,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

export type { DevServer };
export { startDevServer };
