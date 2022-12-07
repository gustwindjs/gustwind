import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { getJson } from "../../utilities/fs.ts";
import type { ProjectMeta, Route, Router } from "../../types.ts";

// TODO: Should data source loading go through this?
async function plugin(
  { routesPath }: { routesPath: string },
): Promise<Router> {
  const routes = await getJson<Record<string, Route>>(routesPath);

  /*
  const dataSources = projectPaths.dataSources
    ? await import("file://" + projectPaths.dataSources).then((m) => m)
    : {};
  */

  return {
    getAllRoutes: async () => {
      return flattenRoutes(
        await expandRoutes({
          routes,
          // TODO: Figure out where/how to load data sources
          dataSources,
        }),
      );
    },
    getRoute() {
      return undefined;
    },
  };
}

export { plugin };
