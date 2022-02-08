import { path as _path } from "../deps.ts";
import { get } from "../utils/functional.ts";
import { getContext } from "./getContext.ts";
import type { Mode, Route } from "../types.ts";

async function expandRoutes({ mode, routes, dataSourcesPath, transformsPath }: {
  mode: Mode;
  routes: Route["routes"];
  dataSourcesPath: string;
  transformsPath: string;
}): Promise<NonNullable<Route["routes"]>> {
  if (!routes) {
    throw new Error("Missing route definition");
  }

  const ret = Object.fromEntries(
    await Promise.all(
      Object.entries(routes).map(([url, route]) =>
        expandRoute({ url, route, mode, dataSourcesPath, transformsPath })
      ),
    ),
  );

  // / is an exception. If it has an expansion, then it has to be added
  // to the root as otherwise the router won't find it later.
  if (ret["/"]) {
    return { ...ret, ...ret["/"].routes, "/": { ...ret["/"], routes: {} } };
  }

  return ret;
}

async function expandRoute(
  { url, route, mode, dataSourcesPath, transformsPath }: {
    mode: Mode;
    dataSourcesPath: string;
    transformsPath: string;
    url: string;
    route: Route;
  },
): Promise<[string, Route]> {
  let ret = { ...route };

  if (route.expand) {
    const { dataSources, matchBy } = route.expand;

    if (!matchBy) {
      throw new Error("Tried to matchBy a path that is not matchable");
    }

    if (!dataSources) {
      throw new Error("Missing dataSources");
    }

    const pageData = await getContext(
      mode,
      dataSourcesPath,
      transformsPath,
      dataSources,
    );
    const dataSource = pageData[matchBy.dataSource];

    if (!dataSource) {
      throw new Error("Missing data source");
    }

    const expandedRoutes: Record<string, Route> = {};

    if (matchBy.collection) {
      (Array.isArray(dataSource)
        ? dataSource
        : Object.values(dataSource[matchBy.collection])).forEach((match) => {
          const u = get(match, matchBy.slug);

          if (!u) {
            throw new Error("Route is missing");
          }

          // @ts-ignore route.expand exists by now for sure
          const { meta, layout } = route.expand;

          expandedRoutes[u] = {
            meta,
            layout,
            context: route.context ? { ...route.context, match } : { match },
            url: u,
          };
        });
    } else {
      // TODO: Give a warning if dataSource isn't an array
      Array.isArray(dataSource) && dataSource.forEach((match) => {
        const u = get(match, matchBy.slug);

        if (!u) {
          throw new Error("Route is missing");
        }

        // @ts-ignore route.expand exists by now for sure
        const { meta, layout } = route.expand;

        // @ts-ignore Not sure how to type this
        expandedRoutes[u] = {
          meta,
          layout,
          context: { match },
          url: u,
        };
      });
    }

    ret = {
      ...route,
      routes: { ...(route.routes || {}), ...expandedRoutes },
    };
  }

  return [url, { ...ret, url }];
}

export { expandRoute, expandRoutes };
