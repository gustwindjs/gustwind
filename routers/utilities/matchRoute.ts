import { trim } from "../../utilities/string.ts";
import { expandRoute } from "./expandRoutes.ts";
import type { DataSources, Route } from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";
import { mergeRouteScripts } from "./routeScripts.ts";

const DEBUG = isDebugEnabled();

async function matchRoute(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
  inheritedScripts?: Route["scripts"],
): Promise<Route> {
  if (!routes) {
    throw new Error("No routes were provided!");
  }

  const parts = url === "/" ? ["/"] : trim(url, "/").split("/");
  const match = routes[url] || routes[parts[0]];
  const matchScripts = mergeRouteScripts(inheritedScripts, match?.scripts);

  if (match && parts.length > 1) {
    let recursiveMatch;

    if (match.routes) {
      try {
        recursiveMatch = await matchRoute(
          match.routes,
          parts.slice(1).join("/"),
          dataSources,
          matchScripts,
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
        inheritedScripts,
        recurse: false,
      });

      if (expandedRoute.routes) {
        return matchRoute(
          expandedRoute.routes,
          parts.slice(1).join("/"),
          dataSources,
          inheritedScripts,
        );
      }
    }
  }

  if (match) {
    return matchScripts ? { ...match, scripts: matchScripts } : match;
  }

  // Root / is a special case. Ideally it could be folded to the code above
  // The problem is that it can have expansions behind it.
  if (routes["/"]?.expand) {
    const [_expandedUrl, expandedRoute] = await expandRoute({
      url,
      route: routes["/"],
      dataSources,
      inheritedScripts,
      recurse: false,
    });

    if (expandedRoute.routes) {
      return matchRoute(
        expandedRoute.routes,
        url,
        dataSources,
        inheritedScripts,
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
