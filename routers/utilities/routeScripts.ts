import type { Route } from "../../types.ts";

type RouteScripts = Route["scripts"];

function mergeRouteScripts(
  parentScripts: RouteScripts,
  childScripts: RouteScripts,
): RouteScripts {
  if (!parentScripts?.length && !childScripts?.length) {
    return undefined;
  }

  const seen = new Set<string>();

  return (parentScripts || []).concat(childScripts || []).filter(({ name }) => {
    if (seen.has(name)) {
      return false;
    }

    seen.add(name);

    return true;
  });
}

export { mergeRouteScripts };
