import { trim } from "../utilities/string.ts";
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
    if (match.routes) {
      return matchRoute(match.routes, parts.slice(1).join("/"), dataSources);
    }

    if (match.expand) {
      // TODO: Use expandRoute here
      console.log("expand now");

      return;
    }
  }

  return match;
}

export { matchRoute };
