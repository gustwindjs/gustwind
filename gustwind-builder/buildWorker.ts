/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import { compileTypeScript } from "../utilities/compileTypeScript.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import { fs, nanoid, path } from "../server-deps.ts";
import type { PluginDefinition } from "../gustwind-utilities/plugins.ts";
import type { BuildWorkerEvent } from "../types.ts";

const mode = "production";
let id: string;
let plugins: PluginDefinition[];

const DEBUG = Deno.env.get("DEBUG") === "1";

self.onmessage = async (e) => {
  const { type }: BuildWorkerEvent = e.data;

  if (type === "init") {
    id = nanoid();

    DEBUG && console.log("worker - starting to init", id);

    const { pluginDefinitions, outputDirectory } = e.data.payload;
    const ret = await importPlugins({
      pluginDefinitions,
      outputDirectory,
      mode,
    });
    plugins = ret.plugins;

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const {
      payload: {
        route,
        filePath,
        dir,
        url,
      },
    } = e.data;

    DEBUG && console.log("worker - starting to build", id, route, filePath);

    const { markup, tasks } = await applyPlugins({
      plugins,
      url,
      route,
    });

    self.postMessage({
      type: "addTasks",
      payload: tasks,
    });

    if (route.type === "xml") {
      await Deno.writeTextFile(dir, markup);
    } else {
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        markup,
      );
    }

    DEBUG && console.log("worker - finished build", id, route, filePath);
  }
  if (type === "writeScript") {
    const { payload: { outputDirectory, file, scriptPath } } = e.data;

    await fs.ensureDir(outputDirectory);
    Deno.writeTextFile(
      path.join(outputDirectory, file),
      await compileTypeScript(scriptPath, "production"),
    );
  }
  if (type === "writeFile") {
    const { payload: { outputDirectory, file, data } } = e.data;

    await fs.ensureDir(outputDirectory);
    await Deno.writeTextFile(path.join(outputDirectory, file), data);
  }
  if (type === "writeFiles") {
    const { payload: { inputDirectory, outputDirectory, outputPath } } = e.data;

    await fs.copy(inputDirectory, path.join(outputDirectory, outputPath), {
      overwrite: true,
    });
  }

  self.postMessage({ type: "finished" });
};
