import { trim } from "../utilities/string.ts";
import { expandRoute } from "./expandRoutes.ts";
import type { DataSources, Route } from "../types.ts";

async function matchRoute(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
): Promise<Route | undefined> {
  if (!routes) {
    return;
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

  return match;
}

export { matchRoute };
