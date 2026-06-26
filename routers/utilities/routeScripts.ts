import type { Route } from "../../types.ts";

type RouteScripts = Route["scripts"];

function mergeRouteScripts(
  parentScripts: RouteScripts,
  childScripts: RouteScripts,
): RouteScripts {
  if (areScriptsEmpty(parentScripts) && areScriptsEmpty(childScripts)) {
    return undefined;
  }

  const seen = new Set<string>();

  return toRouteScriptList(parentScripts)
    .concat(toRouteScriptList(childScripts))
    .filter(({ name }) => {
      if (seen.has(name)) {
        return false;
      }

      seen.add(name);

      return true;
    });
}

function areScriptsEmpty(scripts: RouteScripts) {
  return !scripts || scripts.length === 0;
}

function toRouteScriptList(scripts: RouteScripts) {
  return scripts || [];
}

export { mergeRouteScripts };
