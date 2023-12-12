/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
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

    const { cwd, pluginDefinitions, outputDirectory } = e.data.payload;
    const ret = await importPlugins({
      cwd,
      pluginDefinitions,
      outputDirectory,
      mode,
    });
    plugins = ret.plugins;

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const { payload: { routes, route, dir, url } } = e.data;

    DEBUG && console.log("worker - starting to build", id, route);

    const { markup, tasks } = await applyPlugins({
      plugins,
      url,
      routes,
      route,
    });

    self.postMessage({
      type: "addTasks",
      payload: tasks,
    });

    // TODO: Replace this with a more generic fix somehow
    if (
      url.endsWith(".json") || url.endsWith(".xml") || url.endsWith(".html")
    ) {
      await Deno.writeTextFile(dir, markup);
    } else {
      await fs.ensureDir(dir);
      await Deno.writeTextFile(
        path.join(dir, "index.html"),
        markup,
      );
    }

    DEBUG && console.log("worker - finished build", id, route);
  }
  if (type === "writeFile") {
    const { payload: { outputDirectory, file, data } } = e.data;

    // Avoid 404.html etc.
    if (!outputDirectory.endsWith(".html")) {
      try {
        const filePath = path.join(outputDirectory, file);

        await fs.ensureFile(filePath);
        await Deno.writeFile(filePath, data);
      } catch (err) {
        console.error(err);
      }
    }
  }
  if (type === "writeTextFile") {
    const { payload: { outputDirectory, file, data } } = e.data;

    // Avoid 404.html etc.
    if (!outputDirectory.endsWith(".html")) {
      try {
        const filePath = path.join(outputDirectory, file);

        await fs.ensureFile(filePath);
        await Deno.writeTextFile(filePath, data);
      } catch (err) {
        console.error(err);
      }
    }
  }
  if (type === "copyFiles") {
    const { payload: { inputDirectory, outputDirectory, outputPath } } = e.data;

    await fs.copy(inputDirectory, path.join(outputDirectory, outputPath), {
      overwrite: true,
    });
  }

  self.postMessage({ type: "finished" });
};
