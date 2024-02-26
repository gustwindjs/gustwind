import { path } from "../server-deps.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";

async function build(pluginsLookupPath: string) {
  const cwd = Deno.cwd();
  const pluginsPath = path.join(cwd, pluginsLookupPath || "plugins.json");
  const pluginDefinitions = await evaluatePluginsDefinition(pluginsPath);
  const { plugins } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory: "",
    mode: "production",
  });

  // TODO: Is route the correct abstraction or should there be a way to go through
  // templating logic directly? -> another way to apply plugins?
  // TODO: What to do with possibly remaining tasks
  const { markup, tasks } = await applyPlugins({
    plugins,
    // TODO: Pass url as a parameter?
    url: "",
    // TODO: Get routes definition
    routes: {},
    // TODO: Pass route as a parameter?
    route: { context: {}, url: "", layout: "", meta: {} },
  });

  return markup;
}

export { build };
