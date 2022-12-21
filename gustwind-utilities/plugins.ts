import { path } from "../server-deps.ts";
import { dir, getJson } from "../utilities/fs.ts";
import type {
  Context,
  Mode,
  Plugin,
  PluginApi,
  PluginOptions,
  Route,
  Send,
  Tasks,
} from "../types.ts";

export type LoadedPlugin = {
  plugin: { meta: Plugin["meta"]; api: PluginApi };
  tasks: Tasks;
};
export type PluginDefinition = LoadedPlugin["plugin"];

async function importPlugins(
  { initialImportedPlugins, pluginDefinitions, outputDirectory, mode }: {
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
    const isDevelopingLocally = import.meta.url.startsWith("file:///");
    const { plugin, tasks } = await importPlugin({
      pluginModule: await import(
        isDevelopingLocally
          ? path.join(Deno.cwd(), pluginDefinition.path)
          : pluginDefinition.path
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

  const tasks = await preparePlugins({ plugins: loadedPluginDefinitions });
  await applyOnTasksRegistered({
    plugins: loadedPluginDefinitions,
    tasks: initialTasks.concat(tasks),
  });

  // The idea is to proxy routes from all routers so you can use multiple
  // routers or route definitions to aggregate everything together.
  const router = {
    // Last definition wins
    getAllRoutes() {
      return applyGetAllRoutes({ plugins: loadedPluginDefinitions });
    },
    // First match wins
    matchRoute(url: string) {
      return applyMatchRoutes({ plugins: loadedPluginDefinitions, url });
    },
  };

  return { tasks, plugins: loadedPluginDefinitions, router };
}

async function importPlugin(
  { pluginModule, options, outputDirectory, mode }: {
    pluginModule: Plugin;
    options: Record<string, unknown>;
    outputDirectory: string;
    mode: Mode;
  },
): Promise<LoadedPlugin> {
  const tasks: Tasks = [];
  const api = await pluginModule.init({
    mode,
    options,
    outputDirectory,
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
    plugin: { meta: pluginModule.meta, api },
    tasks,
  };
}

async function preparePlugins(
  { plugins }: { plugins: PluginDefinition[] },
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
    url,
    route,
  }: {
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

function getSend(plugins: PluginDefinition[]): Send {
  return (pluginName, message) => {
    if (pluginName === "*") {
      plugins.forEach(({ api }) => api.onMessage && api.onMessage(message));
    } else {
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
    }
  };
}

async function applyGetAllRoutes({ plugins }: { plugins: PluginDefinition[] }) {
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
  { plugins, url }: { plugins: PluginDefinition[]; url: string },
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
  { context, plugins, route, send, url }: {
    context: Context;
    plugins: PluginDefinition[];
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

export {
  applyAfterEachRenders,
  applyBeforeEachRenders,
  applyOnTasksRegistered,
  applyPlugins,
  applyPrepareContext,
  applyRenders,
  importPlugin,
  importPlugins,
  preparePlugins,
};
