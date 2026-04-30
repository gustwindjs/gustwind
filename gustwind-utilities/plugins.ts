import type {
  Context,
  InitLoadApi,
  LoadedPlugin,
  MatchRoute,
  Mode,
  Plugin,
  PluginOptions,
  Render,
  RenderSync,
  Route,
  Routes,
  Send,
  Tasks,
} from "../types.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";

const DEBUG = isDebugEnabled();

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
      initialTasks = initialTasks.concat(plugin.moduleTasks || [], tasks);
    });
  }

  const renderComponent: Render = function (
    { componentName, htmlInput, context, props },
  ) {
    return applyRenderComponents({
      componentName,
      htmlInput,
      props,
      context,
      plugins: loadedPluginDefinitions,
      matchRoute: router.matchRoute,
    });
  };

  const renderComponentSync: RenderSync = function (
    { componentName, htmlInput, context, props },
  ) {
    return applyRenderComponentsSync({
      componentName,
      htmlInput,
      props,
      context,
      plugins: loadedPluginDefinitions,
      matchRoute: router.matchRoute,
    });
  };

  // TODO: Probably this logic should be revisited to make it more robust
  // with dependency cycles etc.
  // TODO: Validate that all plugin dependencies exist in configuration
  for await (const pluginDefinition of pluginDefinitions) {
    const pluginModuleTasks: Tasks = [];
    const { plugin, tasks } = await importPlugin({
      cwd,
      pluginModule: pluginDefinition.module ||
        await loadPluginModule({
          cwd,
          initLoadApi,
          path: pluginDefinition.path,
          tasks: pluginModuleTasks,
        }),
      options: pluginDefinition.options,
      outputDirectory,
      renderComponent,
      renderComponentSync,
      initLoadApi,
      mode,
    });
    initialTasks = initialTasks.concat(pluginModuleTasks, tasks);
    plugin.moduleTasks = pluginModuleTasks;

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
    matchRoute(url: string): Promise<Route | undefined> {
      return applyMatchRoutes({ plugins: loadedPluginDefinitions, url });
    },
  };

  return { initialTasks, plugins: loadedPluginDefinitions, router };
}

async function loadPluginModule(
  {
    cwd,
    initLoadApi,
    path,
    tasks,
  }: {
    cwd: string;
    initLoadApi: InitLoadApi;
    path: string;
    tasks: Tasks;
  },
): Promise<Plugin> {
  const exports = await initLoadApi(tasks).module<{
    default?: Plugin;
    plugin?: Plugin;
  }>({
    path: await resolvePluginPath(cwd, path),
    type: "plugins",
  });
  const pluginModule = exports.plugin || exports.default;

  if (!pluginModule) {
    throw new Error(`Failed to load plugin from ${path}`);
  }

  return pluginModule;
}

async function resolvePluginPath(cwd: string, path: string) {
  if (
    ["file:", "http://", "https://"].some((prefix) => path.startsWith(prefix)) ||
    path.startsWith("/")
  ) {
    return path;
  }

  const { join } = await import("node:path");
  return join(cwd, path);
}

async function importPlugin(
  {
    cwd,
    pluginModule,
    options,
    outputDirectory,
    renderComponent,
    renderComponentSync,
    initLoadApi,
    mode,
  }: {
    cwd: string;
    pluginModule: Plugin;
    options: Record<string, unknown>;
    outputDirectory: string;
    renderComponent?: Render;
    renderComponentSync?: RenderSync;
    initLoadApi: InitLoadApi;
    mode: Mode;
  },
): Promise<LoadedPlugin> {
  const tasks: Tasks = [];
  const api = await pluginModule.init({
    cwd,
    mode,
    options: options || {},
    outputDirectory,
    renderComponent: renderComponent || (() => Promise.resolve("")),
    renderComponentSync: renderComponentSync || (() => ""),
    load: initLoadApi(tasks),
  });

  return {
    plugin: {
      meta: pluginModule.meta,
      api,
      context: api.initPluginContext ? await api.initPluginContext() : {},
      moduleTasks: [],
      tasks,
    },
    tasks,
  };
}

async function sendMessages(plugins: PluginDefinition[]) {
  const messageSenders = plugins.map((
    { api, context },
  ) => [api.sendMessages, context])
    .filter(Boolean);
  const send = createSend(plugins);

  for await (const [sendMessagesFn, pluginContext] of messageSenders) {
    if (sendMessagesFn) {
      // @ts-expect-error It's not clear how to type context
      await sendMessagesFn({ send, pluginContext });
    }
  }
}

async function preparePlugins(plugins: PluginDefinition[]) {
  const send = createSend(plugins);
  return await runLifecycleHooksInDependencyLayers({
    getHook: ({ api }) => api.prepareBuild,
    plugins,
    runHook: async (prepareBuild, pluginContext) =>
      await prepareBuild({ send, pluginContext }),
  });
}

async function finishPlugins(plugins: PluginDefinition[]) {
  const send = createSend(plugins);
  return await runLifecycleHooksInDependencyLayers({
    getHook: ({ api }) => api.finishBuild,
    plugins,
    runHook: async (finishBuild, pluginContext) =>
      await finishBuild({ send, pluginContext }),
  });
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
    route,
    initialContext,
    matchRoute,
  }: {
    route: Route;
    plugins: PluginDefinition[];
    url: string;
    initialContext?: Context;
    matchRoute: MatchRoute;
  },
) {
  const send = createSend(plugins);
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
    matchRoute,
    plugins,
    route,
    send,
    url,
  });
  await applyOnTasksRegistered({ plugins, tasks });

  const markup = await applyRenderLayouts({
    context,
    plugins,
    route,
    send,
    url,
    matchRoute,
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
  ) => api.getAllRoutes && [api.getAllRoutes, context])
    .filter(Boolean);
  let allRoutes: Record<string, Route> = {};
  let allTasks: Tasks = [];

  // @ts-expect-error Figure out the right type for this
  for await (const [routeGetter, pluginContext] of getAllRoutes) {
    const { routes, tasks } = await routeGetter({ pluginContext });

    allRoutes = { ...allRoutes, ...routes };
    allTasks = allTasks.concat(tasks);
  }

  return { routes: allRoutes, tasks: allTasks };
}

async function applyMatchRoutes(
  { plugins, url }: {
    plugins: PluginDefinition[];
    url: string;
  },
) {
  const matchRoutes = plugins.map((
    { api, context },
  ) => api.matchRoute && [api.matchRoute, context])
    .filter(Boolean);

  // @ts-expect-error Figure out the right type for this
  for await (const [matchRoute, pluginContext] of matchRoutes) {
    const matchedRoute = matchRoute &&
      matchRoute(url, pluginContext);

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
  ) => api.prepareContext && [api.prepareContext, context])
    .filter(Boolean);

  // @ts-expect-error Figure out the right type for this
  for await (const [prepareContext, pluginContext] of prepareContexts) {
    const ret = await prepareContext({ send, route, url, pluginContext });

    if (ret?.context) {
      context = { ...context, ...ret.context };
    }
  }

  return context;
}

async function applyBeforeEachRenders(
  { context, matchRoute, plugins, route, send, url }: {
    context: Context;
    matchRoute: MatchRoute;
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
      await beforeEachRender({ context, matchRoute, route, send, url });

    if (tasksToAdd) {
      tasks = tasks.concat(tasksToAdd);
    }
  }

  return { tasks };
}

async function applyRenderComponents(
  { componentName, htmlInput, props, context, plugins, matchRoute }: {
    componentName?: string;
    htmlInput?: string;
    context?: Context;
    props?: Context;
    plugins: PluginDefinition[];
    matchRoute: MatchRoute;
  },
) {
  const renders = plugins.map((
    { api, context },
  ) => api.renderComponent && [api.renderComponent, context]).filter(Boolean);
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  // @ts-expect-error Figure out the right type for this
  for await (const [renderComponent, pluginContext] of renders) {
    markup = await renderComponent({
      componentName,
      htmlInput,
      context,
      props,
      matchRoute,
      pluginContext,
    });
  }

  return markup;
}

function applyRenderComponentsSync(
  { componentName, htmlInput, props, context, plugins, matchRoute }: {
    componentName?: string;
    htmlInput?: string;
    context?: Context;
    props?: Context;
    plugins: PluginDefinition[];
    matchRoute: MatchRoute;
  },
) {
  const renders = plugins.map((
    { api, context },
  ) => api.renderComponent && [api.renderComponentSync, context]).filter(
    Boolean,
  );
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  // @ts-expect-error Figure out the right type for this
  for (const [renderComponent, pluginContext] of renders) {
    markup = renderComponent({
      componentName,
      htmlInput,
      context,
      props,
      matchRoute,
      pluginContext,
    });
  }

  return markup;
}

async function applyRenderLayouts(
  { context, plugins, route, send, url, matchRoute }: {
    context: Context;
    plugins: PluginDefinition[];
    route: Route;
    send: Send;
    url: string;
    matchRoute: MatchRoute;
  },
) {
  const renders = plugins.map((
    { api, context },
  ) => api.renderLayout && [api.renderLayout, context]).filter(Boolean);
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  // @ts-expect-error Figure out the right type for this
  for await (const [renderLayout, pluginContext] of renders) {
    markup = await renderLayout({
      context,
      route,
      send,
      url,
      matchRoute,
      pluginContext,
    });
  }

  return markup;
}

async function applyOnTasksRegistered(
  { plugins, tasks }: { plugins: PluginDefinition[]; tasks: Tasks },
) {
  const send = createSend(plugins);
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

function createSend(plugins: PluginDefinition[]) {
  const send: Send = async (pluginName, message) => {
    if (pluginName === "*") {
      DEBUG && console.log("Send to all", message);

      const messageResults = (await Promise.all(
        plugins.map(async (plugin) => {
          const { api, context: pluginContext } = plugin;

          if (api.onMessage) {
            const payload = await api.onMessage({
              message,
              pluginContext,
              send,
            });

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
            send,
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

  return send;
}

async function runLifecycleHooksInDependencyLayers<T>(
  {
    getHook,
    plugins,
    runHook,
  }: {
    getHook(plugin: PluginDefinition): ((args: any) => Promise<Tasks | void> | Tasks | void) | undefined;
    plugins: PluginDefinition[];
    runHook(
      hook: (args: any) => Promise<Tasks | void> | Tasks | void,
      pluginContext: Context,
    ): Promise<Tasks | void>;
  },
) {
  let tasks: Tasks = [];

  for (const layer of getDependencyLayers(plugins.filter((plugin) => getHook(plugin)))) {
    const layerTasks = await Promise.all(
      layer.map(async (plugin) => {
        const hook = getHook(plugin);

        if (!hook) {
          return;
        }

        return await runHook(hook, plugin.context);
      }),
    );

    for (const tasksToAdd of layerTasks) {
      if (tasksToAdd) {
        tasks = tasks.concat(tasksToAdd);
      }
    }
  }

  return tasks;
}

function getDependencyLayers(plugins: PluginDefinition[]) {
  const remaining = [...plugins];
  const layers: PluginDefinition[][] = [];
  const pluginNames = new Set(plugins.map(({ meta }) => meta.name));

  while (remaining.length) {
    const ready = remaining.filter(({ meta }) =>
      (meta.dependsOn || []).every((dependencyName) =>
        !pluginNames.has(dependencyName) ||
        !remaining.some(({ meta }) => meta.name === dependencyName)
      )
    );

    if (!ready.length) {
      throw new Error(
        `Failed to resolve plugin lifecycle order for ${
          remaining.map(({ meta }) => meta.name).join(", ")
        }`,
      );
    }

    layers.push(ready);

    for (const plugin of ready) {
      remaining.splice(remaining.indexOf(plugin), 1);
    }
  }

  return layers;
}

export {
  applyAfterEachRenders,
  applyBeforeEachRenders,
  applyMatchRoutes,
  applyOnTasksRegistered,
  applyPlugins,
  applyPrepareContext,
  applyRenderLayouts,
  cleanUpPlugins,
  createSend,
  finishPlugins,
  getDependencyLayers,
  importPlugin,
  importPlugins,
  preparePlugins,
};
