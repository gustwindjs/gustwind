import { cache, lookup, path as _path, Server } from "../server-deps.ts";
import { compileScript, compileScripts } from "../utilities/compileScripts.ts";
import { dir } from "../utilities/fs.ts";
import { trim } from "../utilities/string.ts";
import { respond } from "../gustwind-utilities/respond.ts";
import { applyPlugins, importPlugins } from "../gustwind-utilities/plugins.ts";
import type { Mode, ProjectMeta } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function serveGustwind({
  projectMeta,
  mode,
}: {
  projectMeta: ProjectMeta;
  mode: Mode;
}) {
  const { plugins, router, tasks } = await importPlugins(projectMeta);
  const pluginScripts = tasks.filter(({ type }) => type === "writeScript")
    .map(({ payload }) => ({
      // @ts-expect-error This is writeScript by now
      path: payload.scriptPath,
      // @ts-expect-error This is writeScript by now
      name: payload.scriptName,
    }));
  let scriptsToCompile: { path: string; name: string }[] = [];

  // TODO: Handle through tasks or compile on demand?
  if (pluginScripts) {
    scriptsToCompile = scriptsToCompile.concat(pluginScripts);
  }

  const server = new Server({
    handler: async ({ url }) => {
      // TODO: Trigger beforeEachRequest here
      const { pathname } = new URL(url);
      const matchedRoute = await router.matchRoute(pathname);

      if (matchedRoute) {
        console.log(matchedRoute);

        let contentType = "text/html; charset=utf-8";

        // TODO: Restore
        // If there's cached data, use it instead. This fixes
        // the case in which there was an update over a websocket and
        // also avoids the need to hit the file system for getting
        // the latest data.
        // const layout: Layout = cache.layouts[layoutName] ||
        // matchedLayout;

        const { markup, tasks } = await applyPlugins({
          plugins,
          mode,
          url,
          projectMeta,
          route: matchedRoute,
        });

        // TODO: Process writeFile tasks -> write to a virtual fs to serve
        console.log("tasks", tasks);

        if (matchedRoute.type === "xml") {
          // https://stackoverflow.com/questions/595616/what-is-the-correct-mime-type-to-use-for-an-rss-feed
          contentType = "text/xml";
        }

        return respond(200, markup, contentType);
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
