import { join as joinPath } from "node:path";
import process from "node:process";
import type {
  Context,
  InitLoadApi,
  LoadedPlugin,
  Mode,
  Plugin,
  PluginOptions,
  Route,
  Routes,
  Send,
  Tasks,
} from "../types.ts";

const DEBUG = process.env.DEBUG === "1";

export type PluginDefinition = LoadedPlugin["plugin"];

async function importPlugins(
  {
    cwd,
    initialImportedPlugins,
    pluginDefinitions,
    outputDirectory,
    initLoadApi,
    mode,
  }: {
    cwd: string;
    initialImportedPlugins?: LoadedPlugin[];
    pluginDefinitions: PluginOptions[];
    outputDirectory: string;
    initLoadApi: InitLoadApi;
    mode: Mode;
  },
) {
  const loadedPluginDefinitions: PluginDefinition[] = [];
  let initialTasks: Tasks = [];

  if (initialImportedPlugins) {
    initialImportedPlugins.forEach(({ plugin, tasks }) => {
      loadedPluginDefinitions.push(plugin);
      initialTasks = initialTasks.concat(tasks);
    });
  }

  // TODO: Probably this logic should be revisited to make it more robust
  // with dependency cycles etc.
  // TODO: Validate that all plugin dependencies exist in configuration
  for await (const pluginDefinition of pluginDefinitions) {
    const { plugin, tasks } = await importPlugin({
      cwd,
      pluginModule: pluginDefinition.module || await import(
        pluginDefinition.path.startsWith("http")
          ? pluginDefinition.path
          : joinPath(cwd, pluginDefinition.path)
      )
        .then(({ plugin }) => plugin),
      options: pluginDefinition.options,
      outputDirectory,
      initLoadApi,
      mode,
    });
    initialTasks = initialTasks.concat(tasks);

    const { dependsOn } = plugin.meta;
    const dependencyIndex = loadedPluginDefinitions.findIndex(
      ({ meta: { name } }) => dependsOn?.includes(name),
    );

    // If there are dependencies, make sure the plugin is evaluated last
    if (dependencyIndex < 0) {
      loadedPluginDefinitions.unshift(plugin);
    } else {
      loadedPluginDefinitions.push(plugin);
    }
  }

  await applyOnTasksRegistered({
    plugins: loadedPluginDefinitions,
    tasks: initialTasks,
  });

  await sendMessages(loadedPluginDefinitions);

  // The idea is to proxy routes from all routers so you can use multiple
  // routers or route definitions to aggregate everything together.
  const router = {
    // Last definition wins
    getAllRoutes() {
      return applyGetAllRoutes({ plugins: loadedPluginDefinitions });
    },
    // First match wins
    matchRoute(allRoutes: Routes, url: string) {
      return applyMatchRoutes({
        allRoutes,
        plugins: loadedPluginDefinitions,
        url,
      });
    },
  };

  return { plugins: loadedPluginDefinitions, router };
}

async function importPlugin(
  { cwd, pluginModule, options, outputDirectory, initLoadApi, mode }: {
    cwd: string;
    pluginModule: Plugin;
    options: Record<string, unknown>;
    outputDirectory: string;
    initLoadApi: InitLoadApi;
    mode: Mode;
  },
): Promise<LoadedPlugin> {
  const tasks: Tasks = [];
  const api = await pluginModule.init({
    cwd,
    mode,
    options,
    outputDirectory,
    load: initLoadApi(tasks),
  });

  return {
    plugin: {
      meta: pluginModule.meta,
      api,
      context: api.initPluginContext ? await api.initPluginContext() : {},
    },
    tasks,
  };
}

async function sendMessages(plugins: PluginDefinition[]) {
  const messageSenders = plugins.map((
    { api, context },
  ) => [api.sendMessages, context])
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const [sendMessagesFn, pluginContext] of messageSenders) {
    if (sendMessagesFn) {
      // @ts-expect-error It's not clear how to type context
      await sendMessagesFn({ send, pluginContext });
    }
  }
}

async function preparePlugins(plugins: PluginDefinition[]) {
  let prepareTasks: Tasks = [];
  const prepareBuilds = plugins.map((
    { api, context },
  ) => [api.prepareBuild, context])
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const [prepareBuild, pluginContext] of prepareBuilds) {
    if (prepareBuild) {
      // @ts-expect-error It's not clear how to type context
      const tasksToAdd = await prepareBuild({ send, pluginContext });

      if (tasksToAdd) {
        prepareTasks = prepareTasks.concat(tasksToAdd);
      }
    }
  }

  return prepareTasks;
}

async function finishPlugins(plugins: PluginDefinition[]) {
  let finishTasks: Tasks = [];
  const finishBuilds = plugins.map((
    { api, context },
  ) => [api.finishBuild, context])
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const [finishBuild, pluginContext] of finishBuilds) {
    if (finishBuild) {
      // @ts-expect-error It's not clear how to type context
      const tasksToAdd = await finishBuild({ send, pluginContext });

      if (tasksToAdd) {
        finishTasks = finishTasks.concat(tasksToAdd);
      }
    }
  }

  return finishTasks;
}

async function cleanUpPlugins(plugins: PluginDefinition[], routes: Routes) {
  const cleanUps = plugins.map(({ api, context }) => [api.cleanUp, context])
    .filter(Boolean);

  for await (const [cleanUp, pluginContext] of cleanUps) {
    if (cleanUp) {
      // @ts-expect-error It's not clear how to type context
      await cleanUp({ routes, pluginContext });
    }
  }
}

async function applyPlugins(
  {
    plugins,
    url,
    routes,
    route,
    initialContext,
  }: {
    routes: Routes;
    route: Route;
    plugins: PluginDefinition[];
    url: string;
    initialContext?: Context;
  },
) {
  const send = getSend(plugins);
  const context = {
    ...initialContext,
    ...(await applyPrepareContext({
      plugins,
      send,
      route,
      url,
    })),
  };

  const { tasks } = await applyBeforeEachRenders({
    context,
    plugins,
    route,
    send,
    url,
  });
  await applyOnTasksRegistered({ plugins, tasks });

  const markup = await applyRenders({
    context,
    plugins,
    routes,
    route,
    send,
    url,
  });

  return {
    markup: await applyAfterEachRenders({
      context,
      markup,
      plugins,
      route,
      send,
      url,
    }),
    tasks,
  };
}

async function applyGetAllRoutes({ plugins }: { plugins: PluginDefinition[] }) {
  const getAllRoutes = plugins.map((
    { api, context },
  ) => [api.getAllRoutes, context])
    .filter(Boolean);
  let allRoutes: Record<string, Route> = {};
  let allTasks: Tasks = [];

  for await (const [routeGetter, pluginContext] of getAllRoutes) {
    if (routeGetter) {
      // @ts-expect-error It's not clear how to type context
      const { routes, tasks } = await routeGetter({ pluginContext });

      allRoutes = { ...allRoutes, ...routes };
      allTasks = allTasks.concat(tasks);
    }
  }

  return { routes: allRoutes, tasks: allTasks };
}

async function applyMatchRoutes(
  { allRoutes, plugins, url }: {
    allRoutes: Routes;
    plugins: PluginDefinition[];
    url: string;
  },
) {
  const matchRoutes = plugins.map((
    { api, context },
  ) => [api.matchRoute, context])
    .filter(Boolean);

  for await (const [matchRoute, pluginContext] of matchRoutes) {
    const matchedRoute = matchRoute &&
      // @ts-expect-error It's not clear how to type context
      matchRoute(allRoutes, url, pluginContext);

    if (matchedRoute) {
      return matchedRoute;
    }
  }

  return false;
}

async function applyPrepareContext(
  { plugins, route, send, url }: {
    plugins: PluginDefinition[];
    route: Route;
    send: Send;
    url: string;
  },
) {
  let context = {};
  const prepareContexts = plugins.map((
    { api, context },
  ) => [api.prepareContext, context])
    .filter(Boolean);

  for await (const [prepareContext, pluginContext] of prepareContexts) {
    if (prepareContext) {
      // @ts-expect-error It's not clear how to type context
      const ret = await prepareContext({ send, route, url, pluginContext });

      if (ret?.context) {
        context = { ...context, ...ret.context };
      }
    }
  }

  return context;
}

async function applyBeforeEachRenders(
  { context, plugins, route, send, url }: {
    context: Context;
    plugins: PluginDefinition[];
    route: Route;
    send: Send;
    url: string;
  },
) {
  let tasks: Tasks = [];
  const beforeEachRenders = plugins.map(({ api }) => api.beforeEachRender)
    .filter(Boolean);

  for await (const beforeEachRender of beforeEachRenders) {
    const tasksToAdd =
      // @ts-expect-error We know beforeEachRender should be defined by now
      await beforeEachRender({ context, route, send, url });

    if (tasksToAdd) {
      tasks = tasks.concat(tasksToAdd);
    }
  }

  return { tasks };
}

async function applyRenders(
  { context, plugins, route, routes, send, url }: {
    context: Context;
    plugins: PluginDefinition[];
    route: Route;
    routes: Routes;
    send: Send;
    url: string;
  },
) {
  const renders = plugins.map(({ api, context }) => [api.render, context]);
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  for await (const [render, pluginContext] of renders) {
    if (render) {
      markup =
        // @ts-expect-error We know render should be defined by now
        await render({ context, route, routes, send, url, pluginContext });
    }
  }

  return markup;
}

async function applyOnTasksRegistered(
  { plugins, tasks }: { plugins: PluginDefinition[]; tasks: Tasks },
) {
  const send = getSend(plugins);
  const tasksRegistered = plugins.map(({ api }) => api.onTasksRegistered)
    .filter(Boolean);

  for await (const cb of tasksRegistered) {
    if (cb) {
      await cb({ send, tasks });
    }
  }
}

async function applyAfterEachRenders(
  { context, markup, plugins, route, send, url }: {
    context: Context;
    markup: string;
    plugins: PluginDefinition[];
    route: Route;
    send: Send;
    url: string;
  },
) {
  const afterEachRenders = plugins.map(({ api }) => api.afterEachRender)
    .filter(Boolean);
  for await (const afterEachRender of afterEachRenders) {
    // TODO: Later on this should be able to create new tasks to run
    // @ts-expect-error We know afterEachRender should be defined by now
    const { markup: updatedMarkup } = await afterEachRender({
      context,
      markup,
      route,
      send,
      url,
    });

    markup = updatedMarkup;
  }

  return markup;
}

function getSend(plugins: PluginDefinition[]): Send {
  return async (pluginName, message) => {
    if (pluginName === "*") {
      DEBUG && console.log("Send to all", message);

      const messageResults = (await Promise.all(
        plugins.map(async (plugin) => {
          const { api, context: pluginContext } = plugin;

          if (api.onMessage) {
            const payload = await api.onMessage({ message, pluginContext });

            plugin.context = {
              ...pluginContext,
              ...payload?.pluginContext,
            };

            if (payload) {
              return payload;
            }
          }
        }),
      )).filter(Boolean);

      // @ts-expect-error Make typing more strict here
      const sends = messageResults.flatMap((s) => s.send).filter(Boolean);
      // @ts-expect-error Make typing more strict here
      const results = messageResults.flatMap((s) => s.result).filter(Boolean);

      DEBUG &&
        console.log("Send to all, received from plugins", sends, results);

      // TODO: What to do with sends triggered by messages? Maybe it would be
      // better to drop support for this and handle it otherwise?
      await Promise.all(
        sends.map((message) =>
          Promise.all(plugins.map(async (plugin) => {
            const { api } = plugin;

            if (api.onMessage) {
              // @ts-expect-error TS inference fails here
              const payload = await api.onMessage({ message });

              plugin.context = {
                ...plugin.context,
                ...payload?.pluginContext,
              };
            }
          }))
        ),
      );

      return results;
    } else {
      const foundPlugin = plugins.find(({ meta: { name } }) =>
        pluginName === name
      );

      // Handle ping as a special case
      if (message.type === "ping") {
        return !!foundPlugin;
      }

      if (foundPlugin) {
        if (foundPlugin.api.onMessage) {
          const payload = await foundPlugin.api.onMessage({
            message,
            pluginContext: foundPlugin.context,
          });

          foundPlugin.context = {
            ...foundPlugin.context,
            ...payload?.pluginContext,
          };

          return payload?.result;
        } else {
          throw new Error(
            `Plugin ${pluginName} does not have an onMessage handler`,
          );
        }
      } else {
        throw new Error(
          `Tried to send a plugin (${pluginName}) that does not exist`,
        );
      }
    }
  };
}

export {
  applyAfterEachRenders,
  applyBeforeEachRenders,
  applyOnTasksRegistered,
  applyPlugins,
  applyPrepareContext,
  applyRenders,
  cleanUpPlugins,
  finishPlugins,
  importPlugin,
  importPlugins,
  preparePlugins,
};
