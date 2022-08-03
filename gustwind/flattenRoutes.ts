import type { Route } from "../types.ts";

function flattenRoutes(
  routes?: Record<string, Route>,
  prefix?: string,
): Record<string, Route> {
  if (!routes) {
    return {};
  }

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
