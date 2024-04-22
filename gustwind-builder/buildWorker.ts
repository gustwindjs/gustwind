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
import type { BuildWorkerEvent } from "../types.ts";

const mode = "production";
let id: string;
let plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
let router: Awaited<ReturnType<typeof importPlugins>>["router"];

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
    router = ret.router;

    DEBUG && console.log("worker - finished init", id);
  }
  if (type === "build") {
    const { payload: { route, dir, url } } = e.data;

    DEBUG && console.log("worker - starting to build", id, route);

    try {
      // Matching the url to a route ensures the route contains context
      // (i.e., data sources) related to it. Similar logic is in use
      // for development server. This is a micro-optimization as it
      // avoids work when resolving all routes and allows deferring
      // this work to workers which run in parallel.
      const matchedRoute = await router.matchRoute(url);

      if (!matchedRoute) {
        throw new Error(`Failed to find route ${url} while building`);
      }

      const { markup, tasks } = await applyPlugins({
        plugins,
        url,
        route: matchedRoute,
        matchRoute: (url: string) => applyMatchRoutes({ plugins, url }),
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
