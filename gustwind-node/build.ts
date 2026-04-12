import * as path from "node:path";
import {
  cp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  applyMatchRoutes,
  applyPlugins,
  cleanUpPlugins,
  finishPlugins,
  importPlugins,
  preparePlugins,
} from "../gustwind-utilities/plugins.ts";
import { initLoadApi as initNodeLoadApi, stopModuleBundler } from "../load-adapters/node.ts";
import { validateHtmlDirectory } from "../utilities/htmlValidation.ts";
import { isDebugEnabled } from "../utilities/runtime.ts";
import { stripVoidElementClosers } from "../utilities/stripVoidElementClosers.ts";
import type { BuildWorkerEvent, PluginOptions, Route, Tasks } from "../types.ts";

const DEBUG = isDebugEnabled();

async function buildNode(
  { cwd, outputDirectory, pluginDefinitions, validateOutput = false }: {
    cwd: string;
    outputDirectory: string;
    pluginDefinitions: PluginOptions[];
    validateOutput?: boolean;
  },
) {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const { plugins, router } = await importPlugins({
    cwd,
    pluginDefinitions,
    outputDirectory,
    initLoadApi: initNodeLoadApi,
    mode: "production",
  });

  try {
    const prepareTasks = await preparePlugins(plugins);
    const { routes, tasks: routerTasks } = await router.getAllRoutes();

    if (!routes) {
      throw new Error("No routes found");
    }

    await runTaskQueue({
      router,
      plugins,
      tasks: prepareTasks
        .concat(routerTasks)
        .concat(
          Object.entries(routes)
            .filter(([, route]) => Boolean(route.layout))
            .map(([url, route]) => ({
              type: "build",
              payload: {
                route,
                dir: path.join(outputDirectory, url),
                url: url === "/" ? "/" : "/" + url + "/",
              },
            })),
        ),
    });

    await runTaskQueue({
      router,
      plugins,
      tasks: await finishPlugins(plugins),
    });

    await cleanUpPlugins(plugins, routes);

    if (validateOutput) {
      return await validateHtmlDirectory(outputDirectory);
    }
  } finally {
    await stopModuleBundler();
  }
}

async function runTaskQueue(
  {
    router,
    plugins,
    tasks,
  }: {
    router: {
      matchRoute(url: string): Promise<Route | undefined>;
    };
    plugins: Awaited<ReturnType<typeof importPlugins>>["plugins"];
    tasks: Tasks;
  },
) {
  const queue = [...tasks];

  while (queue.length) {
    const task = queue.shift();

    if (!task) {
      continue;
    }

    DEBUG && console.log("node build - running task", task.type);

    switch (task.type) {
      case "build": {
        const matchedRoute = await router.matchRoute(task.payload.url);

        if (!matchedRoute) {
          throw new Error(
            `Failed to find route ${task.payload.url} while building`,
          );
        }

        const { markup, tasks: routeTasks } = await applyPlugins({
          plugins,
          url: task.payload.url,
          route: matchedRoute,
          matchRoute(url: string) {
            return applyMatchRoutes({ plugins, url });
          },
        });

        queue.push(...routeTasks);
        await writeRenderedPage({
          dir: task.payload.dir,
          markup,
          url: task.payload.url,
        });
        break;
      }
      case "writeFile": {
        if (!task.payload.outputDirectory.endsWith(".html")) {
          const filePath = path.join(
            task.payload.outputDirectory,
            task.payload.file,
          );

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, task.payload.data);
        }
        break;
      }
      case "writeTextFile": {
        if (!task.payload.outputDirectory.endsWith(".html")) {
          const filePath = path.join(
            task.payload.outputDirectory,
            task.payload.file,
          );

          await mkdir(path.dirname(filePath), { recursive: true });
          await writeFile(filePath, task.payload.data);
        }
        break;
      }
      case "copyFiles": {
        await cp(
          task.payload.inputDirectory,
          path.join(task.payload.outputDirectory, task.payload.outputPath),
          { force: true, recursive: true },
        );
        break;
      }
      case "loadJSON":
      case "loadModule":
      case "listDirectory":
      case "readTextFile":
      case "init":
        break;
      default: {
        const _exhaustive: never = task;
        throw new Error(`Unsupported build task ${_exhaustive}`);
      }
    }
  }
}

async function writeRenderedPage(
  { dir, markup, url }: {
    dir: string;
    markup: string;
    url: string;
  },
) {
  if (
    url.endsWith(".json/") || url.endsWith(".xml/") ||
    url.endsWith(".html/")
  ) {
    const output = url.endsWith(".xml/") || url.endsWith(".json/")
      ? markup
      : stripVoidElementClosers(markup);
    await mkdir(path.dirname(dir), { recursive: true });
    await writeFile(dir, output);
    return;
  }

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), stripVoidElementClosers(markup));
}

export { buildNode };
