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
  if (isMissingDataSourceContext(dataSourceIds, dataSources)) {
    return {};
  }

  assertDataSources(dataSources);
  assertDataSourceIds(dataSourceIds);

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

function isMissingDataSourceContext(
  dataSourceIds: Route["dataSources"] | undefined,
  dataSources: DataSources | undefined,
) {
  return !dataSourceIds || !dataSources;
}

function assertDataSourceIds(
  dataSourceIds: Route["dataSources"],
): asserts dataSourceIds is NonNullable<Route["dataSources"]> {
  if (!Array.isArray(dataSourceIds) && !isObject(dataSourceIds)) {
    throw new Error("dataSourceIds is not an object!");
  }
}

function assertDataSources(
  dataSources: DataSources | undefined,
): asserts dataSources is DataSources {
  if (!dataSources) {
    throw new Error("Data sources are missing!");
  }
}

export { getDataSourceContext };
