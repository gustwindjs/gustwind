import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { getJson } from "../../utilities/fs.ts";
import type { ProjectMeta, Route, Router } from "../../types.ts";

// TODO: Should data source loading go through this?
function plugin(
  { routesPath }: { routesPath: string },
): Router {
  const routes = getJson<Record<string, Route>>(routesPath);

  /*
  const dataSources = projectPaths.dataSources
    ? await import("file://" + projectPaths.dataSources).then((m) => m)
    : {};
  */

  // TODO: This should accept a route definition
  // and return an evaluated definition that includes things like
  // project meta at least

  /*
  const expandedRoutes = flattenRoutes(
    await expandRoutes({
      routes,
      dataSources,
    }),
  );
  */

  return {
    getAllRoutes() {
      return [];
    },
    getRoute() {
      return undefined;
    },
  };
}

export { plugin };
