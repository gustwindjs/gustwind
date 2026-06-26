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
      const routeUrl = joinRoutePath(prefix, url);

      if (route.routes) {
        return [[routeUrl, flattenedRoute]].concat(
          Object.entries(flattenRoutes(route.routes, routeUrl, routeScripts)),
        );
      }

      return [[routeUrl, flattenedRoute]];
    }),
  );
}

function joinRoutePath(prefix: string | undefined, url: string) {
  return prefix ? `${prefix}/${url}` : url;
}

export { flattenRoutes };
