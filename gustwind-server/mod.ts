import { cache, lookup, path, Server } from "../server-deps.ts";
import { compileScript, compileScripts } from "../utilities/compileScripts.ts";
import { dirSync } from "../utilities/fs.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import type { Mode, ProjectMeta, Tasks } from "../types.ts";

async function serveGustwind({
  projectMeta,
  mode,
}: {
  projectMeta: ProjectMeta;
  mode: Mode;
}) {
  const { plugins, router, tasks } = await importPlugins(projectMeta);
  let fs = evaluateTasks(tasks);

  const server = new Server({
    handler: async ({ url }) => {
      // TODO: Trigger beforeEachRequest here
      const { pathname } = new URL(url);
      const matchedRoute = await router.matchRoute(pathname);

      if (matchedRoute) {
        const { markup, tasks } = await applyPlugins({
          plugins,
          mode,
          url,
          projectMeta,
          route: matchedRoute,
        });

        fs = { ...fs, ...evaluateTasks(tasks) };

        // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
        return respond(
          200,
          markup,
          matchedRoute.type === "xml" ? "text/xml" : "text/html; charset=utf-8",
        );
      }

      const matchedFsItem = fs[pathname];

      if (matchedFsItem) {
        switch (matchedFsItem.type) {
          case "file":
            return respond(200, matchedFsItem.data, lookup(pathname));
          case "path": {
            const assetPath = matchedFsItem.path;
            const asset = await Deno.readFile(assetPath);

            return respond(200, asset, lookup(assetPath));
          }
        }
      }

      return respond(404, "No matching route");
    },
  });
  const listener = Deno.listen({ port: projectMeta.port });

  return () => server.serve(listener);
}

function evaluateTasks(tasks: Tasks) {
  const ret: Record<
    string,
    { type: "file"; data: string } | {
      type: "path";
      path: string;
    }
  > = {};

  tasks.forEach(({ type, payload }) => {
    switch (type) {
      case "writeFile":
        ret[`/${payload.file}`] = {
          type: "file",
          data: payload.data,
        };
        break;
      case "writeFiles": {
        const outputBasename = path.basename(payload.outputPath);

        dirSync(payload.inputDirectory).forEach((file) => {
          ret[`/${outputBasename}/${file.name}`] = {
            type: "path",
            path: file.path,
          };
        });
        break;
      }
      case "writeScript":
        // TODO: writeScript
        break;
    }
  });

  // TODO
  /*
  const pluginScripts = tasks.filter(({ type }) => type === "writeScript")
    .map(({ payload }) => ({
      // @ts-expect-error This is writeScript by now
      path: payload.scriptPath,
      // @ts-expect-error This is writeScript by now
      name: payload.scriptName,
    }));
  */

  return ret;
}

/*
function compileRemoteGustwindScripts(repository: string, scripts: string[]) {
  const scriptsDirectory = "gustwind-scripts";

  return Promise.all(scripts.map(async (script) => {
    const { path } = await cache(
      `${repository}/${scriptsDirectory}/${script}`,
    );
    // TODO: Validate this one
    const name = script.split(".")[0];

    return compileScript({ name, path, mode: "development" });
  }));
}

async function compileScriptsToJavaScript(
  paths: { path: string; name: string }[],
) {
  try {
    return Object.fromEntries(
      (await compileScripts(paths, "development")).map(
        ({ name, content }) => {
          return [name.replace(".ts", ".js"), content];
        },
      ),
    );
  } catch (error) {
    DEBUG && console.error(error);

    // If the scripts directory doesn't exist or something else goes wrong,
    // above might throw
    return {};
  }
}
*/

export { serveGustwind };
