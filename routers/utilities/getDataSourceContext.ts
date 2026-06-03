import { isObject } from "../../utilities/functional.ts";
import type { DataSources, Route } from "../../types.ts";
import { normalizeRouteDataSources } from "./normalizeRouteDataSources.ts";

async function getDataSourceContext(
  parentDataSources?: Route["parentDataSources"],
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
) {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  if (!Array.isArray(dataSourceIds) && !isObject(dataSourceIds)) {
    throw new Error("dataSourceIds is not an object!");
  }

  const normalizedDataSourceIds = normalizeRouteDataSources(dataSourceIds);

  return Object.fromEntries(
    await Promise.all(
      Object.entries(normalizedDataSourceIds).map(
        async ([name, { operation, parameters }]) => {
          const dataSource = dataSources[operation];

          if (!dataSource) {
            throw new Error(`Data source ${operation} was not found!`);
          }

          return [
            name,
            await dataSource.apply(
              { parentDataSources },
              Array.isArray(parameters) ? parameters : [],
            ),
          ];
        },
      ),
    ),
  );
}

export { getDataSourceContext };
