/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />
import * as path from "node:path";
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import { nanoid } from "https://cdn.skypack.dev/nanoid@5.0.2?min";
import {
  applyMatchRoutes,
  applyPlugins,
  importPlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi } from "../load-adapters/deno.ts";
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
      initLoadApi,
      mode,
    });
    plugins = ret.plugins;

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const { payload: { route, dir, url } } = e.data;

    DEBUG && console.log("worker - starting to build", id, route);

    try {
      const { markup, tasks } = await applyPlugins({
        plugins,
        url,
        route,
        matchRoute(url: string) {
          return applyMatchRoutes({ plugins, url });
        },
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
    } catch (error) {
      console.error(`Failed to build ${url}`);
      throw error;
    }
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
