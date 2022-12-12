import { cache, lookup, path, Server } from "../server-deps.ts";
import { compileTypeScript } from "../utilities/compileTypeScript.ts";
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
  let fs = await evaluateTasks(tasks);

  const server = new Server({
    handler: async ({ url }) => {
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

        fs = { ...fs, ...(await evaluateTasks(tasks)) };

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

async function evaluateTasks(tasks: Tasks) {
  const ret: Record<
    string,
    { type: "file"; data: string } | {
      type: "path";
      path: string;
    }
  > = {};

  await Promise.all(tasks.map(async ({ type, payload }) => {
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
      case "writeScript": {
        const data = await compileTypeScript(
          payload.scriptPath,
          "development",
        );

        ret[`/${payload.scriptName}`] = {
          type: "file",
          data,
        };

        break;
      }
    }
  }));

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
*/

export { serveGustwind };
