import { trim } from "../utilities/string.ts";
import { expandRoute } from "./expandRoutes.ts";
import type { DataSources, Route } from "../types.ts";

async function matchRoute(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
): Promise<Route | undefined> {
  if (!routes) {
    throw new Error("No routes were provided!");
  }

  const parts = trim(url, "/").split("/");
  const match = routes[url] || routes[parts[0]];

  if (match && parts.length > 1) {
    if (match.expand) {
      const [_expandedUrl, expandedRoute] = await expandRoute({
        url,
        route: match,
        dataSources,
        recurse: false,
      });

      if (expandedRoute.routes) {
        return matchRoute(
          expandedRoute.routes,
          parts.slice(1).join("/"),
          dataSources,
        );
      }

      return;
    }

    if (match.routes) {
      return matchRoute(match.routes, parts.slice(1).join("/"), dataSources);
    }
  }

  // Root / is a special case. Ideally it could be folded to the code above
  if (routes["/"]?.expand) {
    const [_expandedUrl, expandedRoute] = await expandRoute({
      url,
      route: routes["/"],
      dataSources,
      recurse: false,
    });

    if (expandedRoute.routes) {
      return matchRoute(
        expandedRoute.routes,
        url,
        dataSources,
      );
    }

    return;
  }

  if (routes["/"]?.routes) {
    return matchRoute(
      routes["/"].routes,
      url,
      dataSources,
    );
  }

  if (!match) {
    throw new Error(`Route "${url}" was not found!`);
  }

  return match;
}

export { matchRoute };
