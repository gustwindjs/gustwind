import type { Route } from "../../types.ts";
import { mergeRouteScripts } from "./routeScripts.ts";

// This function takes a recursive, already expanded route definition
// and converts it into a flat one (a single object)
function flattenRoutes(
  routes: Record<string, Route>,
  prefix?: string,
  inheritedScripts?: Route["scripts"],
): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).flatMap(([url, route]) => {
      const routeScripts = mergeRouteScripts(inheritedScripts, route.scripts);
      const flattenedRoute = routeScripts
        ? { ...route, scripts: routeScripts }
        : route;

      if (route.routes) {
        return [[prefix ? prefix + "/" + url : url, flattenedRoute]].concat(
          Object.entries(
            flattenRoutes(
              route.routes,
              prefix ? `${prefix}/${url}` : url,
              routeScripts,
            ),
          ),
        );
      }

      return [[prefix ? prefix + "/" + url : url, flattenedRoute]];
    }),
  );
}

export { flattenRoutes };
