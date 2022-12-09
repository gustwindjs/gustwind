import { path } from "../server-deps.ts";
import { getContext } from "./context.ts";
import type {
  Context,
  Mode,
  Plugin,
  PluginModule,
  PluginOptions,
  ProjectMeta,
  Renderer,
  Route,
  Tasks,
} from "../types.ts";
import { plugin } from "../plugins/twind/mod.ts";

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

  // Since plugin initialization has been applied already, we can treat
  // what's returned as plugins even if there's a bit more data now.
  return loadedPlugins as Plugin[];
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

async function applyPlugins(
  {
    plugins,
    mode,
    url,
    projectMeta,
    route,
    render,
  }: {
    mode: Mode;
    projectMeta: ProjectMeta;
    route: Route;
    plugins: Plugin[];
    url: string;
    render: Renderer["render"];
  },
) {
  const pluginContext = await applyBeforeEachContext({ plugins, route });

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

  const markup = await render({
    route,
    context,
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

async function applyPrepareBuilds(
  { plugins }: { plugins: Plugin[] },
) {
  let tasks: Tasks = [];
  const prepareBuilds = plugins.map((plugin) => plugin.prepareBuild)
    .filter(Boolean);

  for await (const prepareBuild of prepareBuilds) {
    // @ts-expect-error We know prepareBuild should be defined by now
    const tasksToAdd = await prepareBuild();

    tasks = tasks.concat(tasksToAdd);
  }

  return tasks;
}

async function applyBeforeEachContext(
  { plugins, route }: {
    plugins: Plugin[];
    route: Route;
  },
) {
  let context = {};
  const beforeEachContexts = plugins.map((plugin) => plugin.beforeEachContext)
    .filter(Boolean);

  for await (const beforeEachContext of beforeEachContexts) {
    if (beforeEachContext) {
      const ret = await beforeEachContext({ route });

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
    plugins: Plugin[];
    route: Route;
    url: string;
  },
) {
  let tasks: Tasks = [];
  const beforeEachRenders = plugins.map((plugin) => plugin.beforeEachRender)
    .filter(Boolean);

  for await (const beforeEachRender of beforeEachRenders) {
    const ret =
      // @ts-expect-error We know beforeEachRender should be defined by now
      await beforeEachRender({ context, route, url });

    if (ret?.tasks) {
      tasks = tasks.concat(ret.tasks);
    }
  }

  return { tasks };
}

async function applyAfterEachRenders(
  { context, markup, plugins, route, url }: {
    context: Context;
    markup: string;
    plugins: Plugin[];
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
  applyBeforeEachContext,
  applyBeforeEachRenders,
  applyPlugins,
  applyPrepareBuilds,
  importPlugin,
  importPlugins,
};
