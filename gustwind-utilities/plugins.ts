import { path } from "../server-deps.ts";
import { dir } from "../utilities/fs.ts";
import type {
  Context,
  Mode,
  Plugin,
  PluginApi,
  PluginOptions,
  PluginParameters,
  Route,
  Routes,
  Send,
  Tasks,
} from "../types.ts";

export type LoadedPlugin = {
  plugin: { meta: Plugin["meta"]; api: PluginApi };
  tasks: Tasks;
};
export type PluginDefinition = LoadedPlugin["plugin"];

async function importPlugins(
  {
    cwd,
    initialImportedPlugins,
    pluginDefinitions,
    outputDirectory,
    mode,
  }: {
    cwd: string;
    initialImportedPlugins?: LoadedPlugin[];
    pluginDefinitions: PluginOptions[];
    outputDirectory: string;
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
      pluginModule: await import(
        pluginDefinition.path.startsWith("http")
          ? pluginDefinition.path
          : path.join(cwd, pluginDefinition.path)
      )
        .then(({ plugin }) => plugin),
      options: pluginDefinition.options,
      outputDirectory,
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
  { cwd, pluginModule, options, outputDirectory, mode }: {
    cwd: string;
    pluginModule: Plugin;
    options: Record<string, unknown>;
    outputDirectory: string;
    mode: Mode;
  },
): Promise<LoadedPlugin> {
  const tasks: Tasks = [];
  const api = await pluginModule.init({
    cwd,
    mode,
    options,
    outputDirectory,
    load: {
      dir({ path, extension, recursive, type }) {
        tasks.push({
          type: "listDirectory",
          payload: { path, type },
        });

        return dir({ path, extension, recursive });
      },
      // For some reason TS doesn't infer this correctly
      json<T>(payload: Parameters<PluginParameters["load"]["json"]>[0]) {
        tasks.push({ type: "loadJSON", payload });

        return Deno.readTextFile(payload.path).then((d) => JSON.parse(d));
      },
      // For some reason TS doesn't infer this correctly
      module<T>(payload: Parameters<PluginParameters["load"]["module"]>[0]) {
        tasks.push({ type: "loadModule", payload });

        // TODO: Is it enough to support only local paths here?
        return import(
          `file://${payload.path}?cache=${new Date().getTime()}`
        ) as T;
      },
    },
  });

  return {
    plugin: { meta: pluginModule.meta, api },
    tasks,
  };
}

async function sendMessages(plugins: PluginDefinition[]) {
  const messageSenders = plugins.map(({ api }) => api.sendMessages)
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const sendMessage of messageSenders) {
    if (sendMessage) {
      await sendMessage({ send });
    }
  }
}

async function preparePlugins(plugins: PluginDefinition[]) {
  let prepareTasks: Tasks = [];
  const prepareBuilds = plugins.map(({ api }) => api.prepareBuild)
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const prepareBuild of prepareBuilds) {
    if (prepareBuild) {
      const tasksToAdd = await prepareBuild({ send });

      if (tasksToAdd) {
        prepareTasks = prepareTasks.concat(tasksToAdd);
      }
    }
  }

  return prepareTasks;
}

async function finishPlugins(plugins: PluginDefinition[]) {
  let finishTasks: Tasks = [];
  const finishBuilds = plugins.map(({ api }) => api.finishBuild)
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const finishBuild of finishBuilds) {
    if (finishBuild) {
      const tasksToAdd = await finishBuild({ send });

      if (tasksToAdd) {
        finishTasks = finishTasks.concat(tasksToAdd);
      }
    }
  }

  return finishTasks;
}

async function cleanUpPlugins(plugins: PluginDefinition[], routes: Routes) {
  const cleanUps = plugins.map(({ api }) => api.cleanUp)
    .filter(Boolean);

  for await (const cleanUp of cleanUps) {
    if (cleanUp) {
      await cleanUp({ routes });
    }
  }
}

async function applyPlugins(
  {
    plugins,
    url,
    routes,
    route,
  }: {
    routes: Routes;
    route: Route;
    plugins: PluginDefinition[];
    url: string;
  },
) {
  const send = getSend(plugins);
  const context = await applyPrepareContext({
    plugins,
    send,
    route,
    url,
  });

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
  const getAllRoutes = plugins.map(({ api }) => api.getAllRoutes)
    .filter(Boolean);
  let allRoutes: Record<string, Route> = {};
  let allTasks: Tasks = [];

  for await (const routeGetter of getAllRoutes) {
    if (routeGetter) {
      const { routes, tasks } = await routeGetter();

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
  const matchRoutes = plugins.map(({ api }) => api.matchRoute)
    .filter(Boolean);

  for await (const matchRoute of matchRoutes) {
    const matchedRoute = matchRoute && matchRoute(allRoutes, url);

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
  const prepareContexts = plugins.map(({ api }) => api.prepareContext)
    .filter(Boolean);

  for await (const prepareContext of prepareContexts) {
    if (prepareContext) {
      const ret = await prepareContext({ send, route, url });

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
  const renders = plugins.map(({ api }) => api.render)
    .filter(Boolean);
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  for await (const render of renders) {
    markup =
      // @ts-expect-error We know render should be defined by now
      await render({ context, route, routes, send, url });
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
      const sends = (await Promise.all(
        plugins.map(({ api }) => api.onMessage && api.onMessage({ message })),
      )).filter(Boolean)
        // @ts-expect-error TS inference fails here
        .map(({ send }) => send).flat();

      sends.map((message) =>
        // @ts-expect-error TS inference fails here
        plugins.map(({ api }) => api.onMessage && api.onMessage({ message }))
      );
    } else {
      const foundPlugin = plugins.find(({ meta: { name } }) =>
        pluginName === name
      );

      if (foundPlugin) {
        if (foundPlugin.api.onMessage) {
          return foundPlugin.api.onMessage({ message });
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
