import { trim } from "../utilities/string.ts";
import { expandRoute } from "./expandRoutes.ts";
import type { DataSources, Route } from "../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

async function matchRoute(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
): Promise<Route> {
  if (!routes) {
    throw new Error("No routes were provided!");
  }

  const parts = url === "/" ? ["/"] : trim(url, "/").split("/");
  const match = routes[url] || routes[parts[0]];

  if (match && parts.length > 1) {
    let recursiveMatch;

    if (match.routes) {
      try {
        recursiveMatch = matchRoute(
          match.routes,
          parts.slice(1).join("/"),
          dataSources,
        );
      } catch (_error) {
        // Nothing to do
      }
    }

    if (recursiveMatch) {
      return recursiveMatch;
    }

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
    }
  }

  if (match) {
    return match;
  }

  // Root / is a special case. Ideally it could be folded to the code above
  // The problem is that it can have expansions behind it.
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
  }

  if (!match) {
    DEBUG && console.error(routes, url);
    throw new Error(`Route "${url}" was not found!`);
  }

  return match;
}

export { matchRoute };
