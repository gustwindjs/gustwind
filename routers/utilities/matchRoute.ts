import { trim } from "../../utilities/string.ts";
import { expandRoute } from "./expandRoutes.ts";
import type { DataSources, Route } from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";
import { mergeRouteScripts } from "./routeScripts.ts";

const DEBUG = isDebugEnabled();
type NestedRouteMatchInput = {
  dataSources: DataSources;
  inheritedScripts?: Route["scripts"];
  match: Route;
  matchScripts?: Route["scripts"];
  parts: string[];
  url: string;
};

async function matchRoute(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
  inheritedScripts?: Route["scripts"],
): Promise<Route> {
  if (!routes) {
    throw new Error("No routes were provided!");
  }

  const matchedRoute = await findRouteMatch(
    routes,
    url,
    dataSources,
    inheritedScripts,
  );

  if (matchedRoute) {
    return matchedRoute;
  }

  DEBUG && console.error(routes, url);
  throw new Error(`Route "${url}" was not found!`);
}

async function findRouteMatch(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
  inheritedScripts?: Route["scripts"],
) {
  const parts = getUrlParts(url);
  const match = routes[url] || routes[parts[0]];
  const matchScripts = mergeRouteScripts(inheritedScripts, match?.scripts);

  if (match && parts.length > 1) {
    const nestedMatch = await matchNestedRoute({
      dataSources,
      inheritedScripts,
      match,
      matchScripts,
      parts,
      url,
    });

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  if (match) {
    return applyRouteScripts(match, matchScripts);
  }

  const rootExpansion = await matchRootExpansion(
    routes,
    url,
    dataSources,
    inheritedScripts,
  );

  if (rootExpansion) {
    return rootExpansion;
  }
}

function getUrlParts(url: string) {
  return url === "/" ? ["/"] : trim(url, "/").split("/");
}

async function matchNestedRoute(input: NestedRouteMatchInput) {
  const recursiveMatch = await matchNestedChildRoutes(input);

  if (recursiveMatch) {
    return recursiveMatch;
  }

  return matchExpandedChildRoutes(input);
}

async function matchNestedChildRoutes(
  { match, parts, dataSources, matchScripts }: NestedRouteMatchInput,
) {
  if (!match.routes) {
    return;
  }

  try {
    return await matchRoute(
      match.routes,
      parts.slice(1).join("/"),
      dataSources,
      matchScripts,
    );
  } catch (_error) {
    return;
  }
}

async function matchExpandedChildRoutes(
  { match, url, dataSources, inheritedScripts, parts }: NestedRouteMatchInput,
) {
  if (!match.expand) {
    return;
  }

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

function applyRouteScripts(route: Route, scripts?: Route["scripts"]) {
  return scripts ? { ...route, scripts } : route;
}

async function matchRootExpansion(
  routes: Record<string, Route>,
  url: string,
  dataSources: DataSources,
  inheritedScripts?: Route["scripts"],
) {
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
}

export { matchRoute };
