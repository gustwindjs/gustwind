import { path } from "../server-deps.ts";
import { getContext } from "./context.ts";
import { dir, getJson } from "../utilities/fs.ts";
import type {
  Context,
  Mode,
  PluginApi,
  PluginMeta,
  PluginModule,
  PluginParameters,
  ProjectMeta,
  Route,
  Send,
  Tasks,
} from "../types.ts";

export type ImportedPlugin = { loadedPluginModule: PluginModule; tasks: Tasks };

async function importPlugins(
  { initialImportedPlugins, projectMeta, mode }: {
    initialImportedPlugins?: ImportedPlugin[];
    projectMeta: ProjectMeta;
    mode: Mode;
  },
) {
  const { plugins } = projectMeta;
  const loadedPluginModules: PluginModule[] = [];
  let initialTasks: Tasks = [];

  if (initialImportedPlugins) {
    initialImportedPlugins.forEach(({ loadedPluginModule, tasks }) => {
      loadedPluginModules.push(loadedPluginModule);
      initialTasks = initialTasks.concat(tasks);
    });
  }

  // TODO: Probably this logic should be revisited to make it more robust
  // with dependency cycles etc.
  // TODO: Validate that all plugin dependencies exist in configuration
  for await (const pluginDefinition of plugins) {
    // TODO: Add logic against url based plugins
    const { loadedPluginModule, tasks } = await importPlugin({
      pluginModule: await import(path.join(Deno.cwd(), pluginDefinition.path)),
      options: pluginDefinition.options,
      projectMeta,
      mode,
    });
    initialTasks = initialTasks.concat(tasks);

    const { dependsOn } = loadedPluginModule.meta;
    const dependencyIndex = loadedPluginModules.findIndex(
      ({ meta: { name } }) => dependsOn?.includes(name),
    );

    // If there are dependencies, make sure the plugin is evaluated last
    if (dependencyIndex < 0) {
      loadedPluginModules.unshift(loadedPluginModule);
    } else {
      loadedPluginModules.push(loadedPluginModule);
    }
  }

  const tasks = await preparePlugins({ plugins: loadedPluginModules });
  await applyOnTasksRegistered({
    plugins: loadedPluginModules,
    tasks: initialTasks.concat(tasks),
  });

  // The idea is to proxy routes from all routers so you can use multiple
  // routers or route definitions to aggregate everything together.
  const router = {
    // Last definition wins
    getAllRoutes() {
      return applyGetAllRoutes({ plugins: loadedPluginModules });
    },
    // First match wins
    matchRoute(url: string) {
      return applyMatchRoutes({ plugins: loadedPluginModules, url });
    },
  };

  return { tasks, plugins: loadedPluginModules, router };
}

async function importPlugin<O = Record<string, unknown>>(
  { pluginModule, options, projectMeta, mode }: {
    pluginModule: {
      meta: PluginMeta;
      plugin: (args: PluginParameters<O>) => PluginApi | Promise<PluginApi>;
    };
    options: O;
    projectMeta: ProjectMeta;
    mode: Mode;
  },
): Promise<ImportedPlugin> {
  const tasks: Tasks = [];
  const api = await pluginModule.plugin({
    mode,
    options,
    projectMeta,
    load: {
      dir(path: string, extension: string) {
        tasks.push({
          type: "listDirectory",
          payload: { path },
        });

        return dir(path, extension);
      },
      json<T>(path: string) {
        tasks.push({
          type: "loadJSON",
          payload: { path },
        });

        return getJson<T>(path);
      },
      module<T>(path: string) {
        tasks.push({
          type: "loadModule",
          payload: { path },
        });

        return import(`${path}?cache=${new Date().getTime()}`) as T;
      },
    },
  });

  return {
    loadedPluginModule: { meta: pluginModule.meta, api },
    tasks,
  };
}

async function preparePlugins(
  { plugins }: { plugins: PluginModule[] },
) {
  let tasks: Tasks = [];
  const messageSenders = plugins.map(({ api }) => api.sendMessages)
    .filter(Boolean);
  const prepareBuilds = plugins.map(({ api }) => api.prepareBuild)
    .filter(Boolean);
  const send = getSend(plugins);

  for await (const sendMessage of messageSenders) {
    if (sendMessage) {
      await sendMessage({ send });
    }
  }

  for await (const prepareBuild of prepareBuilds) {
    if (prepareBuild) {
      const tasksToAdd = await prepareBuild({ send });

      if (tasksToAdd) {
        tasks = tasks.concat(tasksToAdd);
      }
    }
  }

  return tasks;
}

async function applyPlugins(
  {
    plugins,
    mode,
    url,
    projectMeta,
    route,
  }: {
    mode: Mode;
    projectMeta: ProjectMeta;
    route: Route;
    plugins: PluginModule[];
    url: string;
  },
) {
  const send = getSend(plugins);
  const pluginContext = await applyPrepareContext({ plugins, send, route });

  const context = {
    ...(await getContext({
      mode,
      url,
      projectMeta,
      route,
    })),
    ...pluginContext,
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

function getSend(plugins: PluginModule[]): Send {
  return (pluginName, message) => {
    const foundPlugin = plugins.find(({ meta: { name } }) =>
      pluginName === name
    );

    if (foundPlugin) {
      if (foundPlugin.api.onMessage) {
        return foundPlugin.api.onMessage(message);
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
  };
}

async function applyGetAllRoutes({ plugins }: { plugins: PluginModule[] }) {
  const getAllRoutes = plugins.map(({ api }) => api.getAllRoutes)
    .filter(Boolean);
  let ret: Record<string, Route> = {};

  for await (const routeGetter of getAllRoutes) {
    if (routeGetter) {
      const routes = await routeGetter();

      ret = { ...ret, ...routes };
    }
  }

  return ret;
}

async function applyMatchRoutes(
  { plugins, url }: { plugins: PluginModule[]; url: string },
) {
  const matchRoutes = plugins.map(({ api }) => api.matchRoute)
    .filter(Boolean);

  for await (const matchRoute of matchRoutes) {
    const matchedRoute = matchRoute && matchRoute(url);

    if (matchedRoute) {
      return matchedRoute;
    }
  }

  return false;
}

async function applyPrepareContext(
  { plugins, route, send }: {
    plugins: PluginModule[];
    route: Route;
    send: Send;
  },
) {
  let context = {};
  const prepareContexts = plugins.map(({ api }) => api.prepareContext)
    .filter(Boolean);

  for await (const prepareContext of prepareContexts) {
    if (prepareContext) {
      const ret = await prepareContext({ send, route });

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
    plugins: PluginModule[];
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
  { context, plugins, route, send, url }: {
    context: Context;
    plugins: PluginModule[];
    route: Route;
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
      await render({ context, route, send, url });
  }

  return markup;
}

async function applyOnTasksRegistered(
  { plugins, tasks }: { plugins: PluginModule[]; tasks: Tasks },
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
    plugins: PluginModule[];
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

export {
  applyAfterEachRenders,
  applyBeforeEachRenders,
  applyPlugins,
  applyPrepareContext,
  applyRenders,
  importPlugin,
  importPlugins,
  preparePlugins,
};
