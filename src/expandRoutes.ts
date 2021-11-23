import { path as _path } from "../deps.ts";
import { get } from "../utils/functional.ts";
import { getContext } from "./getContext.ts";
import type { Route } from "../types.ts";

async function expandRoutes({ routes, dataSourcesPath, transformsPath }: {
  routes: Route["routes"];
  dataSourcesPath: string;
  transformsPath: string;
}): Promise<Route["routes"]> {
  if (!routes) {
    return {};
  }

  const ret = Object.fromEntries(
    await Promise.all(
      Object.entries(routes).map(async ([url, v]) => {
        let ret = { ...v };

        if (v.expand) {
          const { dataSources, matchBy } = v.expand;

          if (!matchBy) {
            throw new Error("Tried to matchBy a path that is not matchable");
          }

          if (!dataSources) {
            throw new Error("Missing dataSources");
          }

          const pageData = await getContext(
            dataSourcesPath,
            transformsPath,
            dataSources,
          );

          const dataSource = pageData[matchBy.dataSource];

          if (!dataSource) {
            throw new Error("Missing data source");
          }

          const expandedRoutes: Record<string, Route> = {};
          Object.values(dataSource[matchBy.collection]).forEach((match) => {
            const route = get(match, matchBy.slug);

            if (!route) {
              throw new Error("Route is missing");
            }

            // @ts-ignore v.expand exists by now for sure
            const { meta, layout } = v.expand;

            expandedRoutes[route] = {
              meta,
              layout,
              context: () => Promise.resolve({ match }),
            };
          });

          ret = {
            ...v,
            routes: { ...(v.routes || {}), ...expandedRoutes },
          };
        }

        if (v.dataSources) {
          const context = () =>
            getContext(
              dataSourcesPath,
              transformsPath,
              // @ts-ignore: dataSources is defined by now for sure
              v.dataSources,
            );

          return [url, { ...ret, context }];
        }
        return [url, ret];
      }),
    ),
  );

  // / is an exception. If it has an expansion, then it has to be added
  // to the root as otherwise the router won't find it later.
  if (ret["/"]) {
    return { ...ret, ...ret["/"].routes, "/": { ...ret["/"], routes: {} } };
  }

  return ret;
}

export { expandRoutes };
