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
import { createServer as createViteServer, type Plugin, type ViteDevServer } from "vite";

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

async function startDevServer(
  {
    cwd,
    pluginDefinitions,
    port = 3000,
    host = "127.0.0.1",
    watchPaths = [],
  }: {
    cwd: string;
    pluginDefinitions: PluginDefinitionsSource;
    port?: number;
    host?: string;
    watchPaths?: string[];
  },
): Promise<DevServer> {
  const watchedPaths = new Set<string>();
  let state = await loadRuntime({ cwd, pluginDefinitions });
  let closed = false;
  let reloadPromise = Promise.resolve();
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
        getClosed: () => closed,
        getState: () => state,
        loadRuntime: () => loadRuntime({ cwd, pluginDefinitions }),
        setReloadPromise(nextReloadPromise) {
          reloadPromise = nextReloadPromise;
        },
        getReloadPromise: () => reloadPromise,
        setState(nextState) {
          state = nextState;
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

  await watchTasks(vite, watchedPaths, state.initialTasks);
  await addWatchPaths(vite, watchedPaths, watchPaths);

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
        state,
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

  requestHandler = vite.middlewares;

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  const address = httpServer.address();
  const listeningPort = typeof address === "object" && address
    ? address.port
    : port;

  return {
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await reloadPromise;
      await cleanUpPlugins(state.plugins, state.routes);
      await stopModuleBundler();
      await vite.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => error ? reject(error) : resolve());
      });
    },
    port: listeningPort,
    url: `http://${host}:${listeningPort}/`,
  };
}

async function handleRequest(
  {
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
  },
) {
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  const matchedRoute = await state.router.matchRoute(pathname);

  if (matchedRoute) {
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

    const payload = pathname.endsWith(".xml")
      ? markup
      : await vite.transformIndexHtml(
        pathname,
        stripVoidElementClosers(markup),
      );

    sendResponse(
      res,
      200,
      payload,
      pathname.endsWith(".xml") ? contentType(".xml") : contentType(".html"),
    );

    return true;
  }

  const prepareTasks = await preparePlugins(state.plugins);
  const finishTasks = await finishPlugins(state.plugins);
  const taskResults = await evaluateTasks(prepareTasks.concat(finishTasks));
  const matchedFsItem = taskResults[pathname] || state.pathFs[pathname];

  await watchTasks(prepareTasks.concat(finishTasks));

  if (matchedFsItem) {
    switch (matchedFsItem.type) {
      case "file":
        sendResponse(
          res,
          200,
          matchedFsItem.data,
          contentType(path.extname(pathname)),
        );
        return true;
      case "path": {
        const asset = await readFile(matchedFsItem.path);
        sendResponse(
          res,
          200,
          asset,
          contentType(path.extname(matchedFsItem.path)),
        );
        return true;
      }
    }
  }

  sendResponse(
    res,
    404,
    `No matching route in ${Object.keys(state.routes).join(", ")}.`,
    contentType(".txt"),
  );

  return true;
}

async function loadRuntime(
  {
    cwd,
    pluginDefinitions,
  }: {
    cwd: string;
    pluginDefinitions: PluginDefinitionsSource;
  },
) {
  const resolvedPluginDefinitions = await resolvePluginDefinitions(
    pluginDefinitions,
  );
  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions: resolvedPluginDefinitions,
    initLoadApi: initDevLoadApi,
    mode: "development",
    outputDirectory: "",
  });
  const { routes, tasks } = await router.getAllRoutes();

  return {
    initialTasks: tasks,
    pathFs: {} as Awaited<ReturnType<typeof evaluateTasks>>,
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

function createRuntimeReloadPlugin(
  {
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
  },
): Plugin {
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
  return tasks.flatMap(({ type, payload }) => {
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
  }).filter((watchPath): watchPath is string =>
    Boolean(watchPath) && !shouldIgnoreWatchPath(watchPath)
  );
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
