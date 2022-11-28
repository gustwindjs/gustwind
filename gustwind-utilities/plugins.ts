import { path } from "../server-deps.ts";
import type {
  Components,
  Context,
  Layout,
  Plugin,
  PluginModule,
  PluginOptions,
  ProjectMeta,
  Route,
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
      projectMeta,
      pluginDefinition,
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

async function importPlugin(
  projectMeta: ProjectMeta,
  pluginDefinition: PluginOptions,
) {
  // TODO: Add logic against url based plugins
  const pluginPath = path.join(Deno.cwd(), pluginDefinition.path);
  const module = await import(pluginPath);

  return { ...module, ...module.plugin(projectMeta, pluginDefinition.options) };
}

async function applyPrepareBuilds(
  { plugins, components }: { plugins: Plugin[]; components: Components },
) {
  let tasks: Tasks = [];

  const prepareBuilds = plugins.map((plugin) => plugin.prepareBuild)
    .filter(Boolean);
  for await (const prepareBuild of prepareBuilds) {
    // @ts-expect-error We know prepareBuild should be defined by now
    const tasksToAdd = await prepareBuild({ components });

    tasks = tasks.concat(tasksToAdd);
  }

  return tasks;
}

async function applyBeforeEachRenders(
  { context, layout, plugins, route, url }: {
    context: Context;
    layout: Layout;
    plugins: Plugin[];
    route: Route;
    url: string;
  },
) {
  const beforeEachRenders = plugins.map((plugin) => plugin.beforeEachRender)
    .filter(Boolean);
  for await (const beforeEachRender of beforeEachRenders) {
    // @ts-expect-error We know beforeEachRender should be defined by now
    await beforeEachRender({
      context,
      layout,
      route,
      url,
    });
  }
}

async function applyAfterEachRenders(
  { context, layout, markup, plugins, route, url }: {
    context: Context;
    layout: Layout;
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
      layout,
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
  applyPrepareBuilds,
  importPlugin,
  importPlugins,
};
