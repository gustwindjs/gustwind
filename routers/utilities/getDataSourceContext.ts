import { performance } from "node:perf_hooks";
import { isObject } from "../../utilities/functional.ts";
import type { BuildDiagnostics, DataSources, Route } from "../../types.ts";
import { normalizeRouteDataSources } from "./normalizeRouteDataSources.ts";
import { mapWithConcurrency } from "../../utilities/concurrency.ts";

async function getDataSourceContext(
  parentDataSources?: Route["parentDataSources"],
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
  routeConcurrency = Number.POSITIVE_INFINITY,
  buildDiagnostics?: BuildDiagnostics,
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
        applyDataSourceContext(
          name,
          source,
          dataSources,
          parentDataSources,
          buildDiagnostics,
        ),
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
  buildDiagnostics?: BuildDiagnostics,
) {
  const dataSource = dataSources[operation];

  if (!dataSource) {
    throw new Error(`Data source ${operation} was not found!`);
  }

  const dataSourceParameters = Array.isArray(parameters) ? parameters : [];
  const startTime = performance.now();
  const cachedResult = buildDiagnostics?.dataSourceCache
    ? await applyMemoizedDataSource({
      buildDiagnostics,
      dataSource,
      operation,
      parameters: dataSourceParameters,
      parentDataSources,
    })
    : {
      cacheHit: false,
      value: await dataSource.apply({ parentDataSources }, dataSourceParameters),
    };

  buildDiagnostics?.recordDataSourceCall?.({
    cacheHit: cachedResult.cacheHit,
    durationMs: performance.now() - startTime,
    name,
    operation,
    parameters: dataSourceParameters,
  });

  return [name, cachedResult.value] as const;
}

async function applyMemoizedDataSource({
  buildDiagnostics,
  dataSource,
  operation,
  parameters,
  parentDataSources,
}: {
  buildDiagnostics: BuildDiagnostics;
  dataSource: DataSources[string];
  operation: string;
  parameters: unknown[];
  parentDataSources: Route["parentDataSources"];
}) {
  const key = getDataSourceCacheKey(operation, parameters);
  const existing = buildDiagnostics.dataSourceCache?.get(key);

  if (existing) {
    return { cacheHit: true, value: await existing };
  }

  const promise = Promise.resolve(
    dataSource.apply({ parentDataSources }, parameters),
  );

  buildDiagnostics.dataSourceCache?.set(key, promise);

  try {
    return { cacheHit: false, value: await promise };
  } catch (error) {
    buildDiagnostics.dataSourceCache?.delete(key);
    throw error;
  }
}

function getDataSourceCacheKey(operation: string, parameters: unknown[]) {
  return JSON.stringify({ operation, parameters });
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
