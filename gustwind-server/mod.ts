import { lookup, Server } from "../server-deps.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import type { Mode, ProjectMeta } from "../types.ts";
import { evaluateTasks } from "./evaluateTasks.ts";

async function serveGustwind({
  projectMeta,
  mode,
}: {
  projectMeta: ProjectMeta;
  mode: Mode;
}) {
  const { plugins, router, tasks } = await importPlugins({ projectMeta, mode });
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
