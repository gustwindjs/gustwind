import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";
import type { InitLoadApi, PluginsDefinition } from "../types.ts";

async function build(
  initLoadApi: InitLoadApi, // TODO: Add a default implementation of the load api for node
  pluginsDefinition: PluginsDefinition,
  url: string,
) {
  const pluginDefinitions = evaluatePluginsDefinition(pluginsDefinition);
  const { plugins, router } = await importPlugins({
    // TODO: Drop dependency on cwd somehow
    cwd: Deno.cwd(),
    pluginDefinitions,
    initLoadApi,
    outputDirectory: "",
    mode: "production",
  });
  const { routes, tasks: initialTasks } = await router.getAllRoutes();
  const route = routes[url];

  if (!route) {
    throw new Error(`Matching route was not found for ${url}!`);
  }

  const { markup, tasks: routeTasks } = await applyPlugins({
    plugins,
    url,
    routes,
    route,
  });

  // Both markup and tasks are returned. The idea is that the consumer can
  // decide what to do with either. For example on edge you might want to
  // handle the tasks dynamically by writing task results to KV and then
  // map to the database through a router on demand.
  return { markup, tasks: initialTasks.concat(routeTasks) };
}

export { build };
