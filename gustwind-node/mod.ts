import { path } from "../server-deps.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";

async function build(pluginsLookupPath: string) {
  const cwd = Deno.cwd();
  const pluginsPath = path.join(cwd, pluginsLookupPath || "plugins.json");
  const pluginDefinitions = await evaluatePluginsDefinition(pluginsPath);

  // TODO: Redefine this, maybe some part should be extracted from the build worker to share
  //await buildProject({ cwd, outputDirectory, pluginDefinitions, threads });
}

export { build };
