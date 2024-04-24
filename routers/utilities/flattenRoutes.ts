import type { Route } from "../../types.ts";

// This function takes a recursive, already expanded route definition
// and converts it into a flat one (a single object)
function flattenRoutes(
  routes: Record<string, Route>,
  prefix?: string,
): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).flatMap(([url, route]) => {
      if (route.routes) {
        return [[prefix ? prefix + "/" + url : url, route]].concat(
          Object.entries(flattenRoutes(route.routes, url)),
        );
      }

      return [[prefix ? prefix + "/" + url : url, route]];
    }),
  );
}

export { flattenRoutes };
