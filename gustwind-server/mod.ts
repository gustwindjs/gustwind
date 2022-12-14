import { lookup, Server } from "../server-deps.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import type { ImportedPlugin } from "../gustwind-utilities/plugins.ts";
import { evaluateTasks } from "./evaluateTasks.ts";
import type { Mode, ProjectMeta } from "../types.ts";

async function serveGustwind({
  plugins: initialImportedPlugins,
  projectMeta,
  mode,
  port,
}: {
  plugins?: ImportedPlugin[];
  projectMeta: ProjectMeta;
  mode: Mode;
  port: number;
}) {
  const { plugins, router, tasks } = await importPlugins({
    initialImportedPlugins,
    projectMeta,
    mode,
  });

  // TODO: How to recalculate fs when a script (script-plugin) changes (
  // triggered by file change plugin)?
  // Ideally it would update **only** the script that changed and nothing else.
  let fs = await evaluateTasks(tasks);

  const server = new Server({
    handler: async ({ url }) => {
      const { pathname } = new URL(url);
      const matchedRoute = await router.matchRoute(pathname);

      if (matchedRoute) {
        const { markup, tasks } = await applyPlugins({
          plugins,
          mode,
          url: pathname,
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
  const listener = Deno.listen({ port });

  return () => server.serve(listener);
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
