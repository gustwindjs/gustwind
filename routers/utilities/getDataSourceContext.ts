import { isObject } from "../../utilities/functional.ts";
import type { DataSources, Route } from "../../types.ts";
import { normalizeRouteDataSources } from "./normalizeRouteDataSources.ts";
import { mapWithConcurrency } from "../../utilities/concurrency.ts";

async function getDataSourceContext(
  parentDataSources?: Route["parentDataSources"],
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
  routeConcurrency = Number.POSITIVE_INFINITY,
) {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  if (!Array.isArray(dataSourceIds) && !isObject(dataSourceIds)) {
    throw new Error("dataSourceIds is not an object!");
  }

  const normalizedDataSourceIds = normalizeRouteDataSources(dataSourceIds);

  return Object.fromEntries(
    await mapWithConcurrency(
      Object.entries(normalizedDataSourceIds),
      routeConcurrency,
      ([name, source]) =>
        applyDataSourceContext(name, source, dataSources, parentDataSources),
    ),
  );
}

async function applyDataSourceContext(
  name: string,
  {
    operation,
    parameters,
  }: ReturnType<typeof normalizeRouteDataSources>[string],
  dataSources: DataSources,
  parentDataSources: Route["parentDataSources"],
) {
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
  ] as const;
}

export { getDataSourceContext };
