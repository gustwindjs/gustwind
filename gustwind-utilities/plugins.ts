import { path } from "../server-deps.ts";
import { getContext } from "./context.ts";
import type {
  Context,
  Mode,
  Plugin,
  PluginModule,
  PluginOptions,
  ProjectMeta,
  Route,
  Send,
  Tasks,
} from "../types.ts";

async function importPlugins(projectMeta: ProjectMeta) {
  const { plugins } = projectMeta;
  const loadedPlugins: PluginModule[] = [];

  // TODO: Probably this logic should be revisited to make it more robust
  // with dependency cycles etc.
  // TODO: Validate that all plugin dependencies exist in configuration
  for await (const pluginDefinition of plugins) {
    const pluginModule: PluginModule = await importPlugin(
      pluginDefinition,
      projectMeta,
    );
    const { dependsOn } = pluginModule.meta;
    const dependencyIndex = loadedPlugins.findIndex(
      ({ meta: { name } }) => dependsOn?.includes(name),
    );

    // If there are dependencies, make sure the plugin is evaluated last
    if (dependencyIndex < 0) {
      loadedPlugins.unshift(pluginModule);
    } else {
      loadedPlugins.push(pluginModule);
    }
  }

  const tasks = await preparePlugins({ plugins: loadedPlugins });

  return { tasks, plugins: loadedPlugins };
}

async function importPlugin<P = Plugin>(
  pluginDefinition: PluginOptions,
  projectMeta: ProjectMeta,
): Promise<PluginModule & P> {
  // TODO: Add logic against url based plugins
  const pluginPath = path.join(Deno.cwd(), pluginDefinition.path);
  const module = await import(pluginPath);
  const pluginApi = await module.plugin(pluginDefinition.options, projectMeta);

  return { ...module, ...pluginApi };
}

async function preparePlugins(
  { plugins }: { plugins: (PluginModule & Plugin)[] },
) {
  let tasks: Tasks = [];
  const messageSenders = plugins.map((plugin) => plugin.sendMessages)
    .filter(Boolean);
  const prepareBuilds = plugins.map((plugin) => plugin.prepareBuild)
    .filter(Boolean);
  const send: Send = (pluginName, message) => {
    const foundPlugin = plugins.find(({ meta: { name } }) =>
      pluginName === name
    );

    if (foundPlugin) {
      if (foundPlugin.onMessage) {
        return foundPlugin.onMessage(message);
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
    plugins: (PluginModule & Plugin)[];
    url: string;
  },
) {
  const pluginContext = await applyPrepareContext({ plugins, route });

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
    url,
  });

  const markup = await applyRenders({
    context,
    plugins,
    route,
    url,
  });

  return {
    markup: await applyAfterEachRenders({
      context,
      markup,
      plugins,
      route,
      url,
    }),
    tasks,
  };
}

async function applyPrepareContext(
  { plugins, route }: {
    plugins: (PluginModule & Plugin)[];
    route: Route;
  },
) {
  let context = {};
  const prepareContexts = plugins.map((plugin) => plugin.prepareContext)
    .filter(Boolean);

  for await (const prepareContext of prepareContexts) {
    if (prepareContext) {
      const ret = await prepareContext({ route });

      if (ret?.context) {
        context = { ...context, ...ret.context };
      }
    }
  }

  return context;
}

async function applyBeforeEachRenders(
  { context, plugins, route, url }: {
    context: Context;
    plugins: (PluginModule & Plugin)[];
    route: Route;
    url: string;
  },
) {
  let tasks: Tasks = [];
  const beforeEachRenders = plugins.map((plugin) => plugin.beforeEachRender)
    .filter(Boolean);

  for await (const beforeEachRender of beforeEachRenders) {
    const tasksToAdd =
      // @ts-expect-error We know beforeEachRender should be defined by now
      await beforeEachRender({ context, route, url });

    if (tasksToAdd) {
      tasks = tasks.concat(tasksToAdd);
    }
  }

  return { tasks };
}

async function applyRenders(
  { context, plugins, route, url }: {
    context: Context;
    plugins: (PluginModule & Plugin)[];
    route: Route;
    url: string;
  },
) {
  const renders = plugins.map((plugin) => plugin.render)
    .filter(Boolean);
  let markup = "";

  // In the current design, we pick only the markup of the last renderer.
  // TODO: Does it even make sense to have multiple renderers in the system?
  for await (const render of renders) {
    markup =
      // @ts-expect-error We know render should be defined by now
      await render({ context, route, url });
  }

  return markup;
}

async function applyAfterEachRenders(
  { context, markup, plugins, route, url }: {
    context: Context;
    markup: string;
    plugins: (PluginModule & Plugin)[];
    route: Route;
    url: string;
  },
) {
  const afterEachRenders = plugins.map((plugin) => plugin.afterEachRender)
    .filter(Boolean);
  for await (const afterEachRender of afterEachRenders) {
    // TODO: Later on this should be able to create new tasks to run
    // @ts-expect-error We know afterEachRender should be defined by now
    const { markup: updatedMarkup } = await afterEachRender({
      context,
      markup,
      route,
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
