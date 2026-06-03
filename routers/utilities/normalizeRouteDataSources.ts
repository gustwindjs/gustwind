import type { DataSource, RouteDataSources } from "../../types.ts";

function normalizeRouteDataSources(
  dataSources: RouteDataSources | undefined,
): Record<string, DataSource> {
  if (!dataSources) {
    return {};
  }

  if (Array.isArray(dataSources)) {
    return Object.fromEntries(
      dataSources.map(({ name, ...dataSource }) => {
        if (!name) {
          throw new Error("Array-shaped dataSources entries require a name");
        }

        return [name, dataSource];
      }),
    );
  }

  return dataSources;
}

export { normalizeRouteDataSources };
