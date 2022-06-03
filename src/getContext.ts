import { path as _path } from "../server-deps.ts";
import { transform } from "./transform.ts";
import type { DataSource, Mode, ProjectMeta } from "../types.ts";

type ResolvedDataSources = Record<string, unknown>;
const resolvedDataSources: ResolvedDataSources = {};

async function getContext(
  mode: Mode,
  dataSourcesPath: ProjectMeta["paths"]["dataSources"],
  transformsPath: ProjectMeta["paths"]["transforms"],
  dataSources?: DataSource[],
) {
  if (dataSources) {
    if (!Array.isArray(dataSources)) {
      throw new Error("Data sources are not defined as an array");
    }

    const ret = [];

    // Resolve promises in series
    for (
      const { id, operation, input, transformWith, dependsOn } of dataSources
    ) {
      const dataSourcePath = _path.join(dataSourcesPath, `${operation}.ts`);

      // TODO: The assumption here is that the dependencies have been declared
      // earlier. Ideally there would be logic to figure out the loading order
      // to avoid this coupling.
      const resolvedData = await import(
        mode === "production"
          ? "file://" + dataSourcePath
          : "file://" + dataSourcePath + "?cache=" + new Date().getTime()
      ).then(async (
        o,
      ) => [
        id,
        await transform(
          mode,
          transformsPath,
          transformWith,
          await o.default(
            input,
            getDependencies(resolvedDataSources, dependsOn),
          ),
        ),
      ]);

      // resolvedData is [id, data]
      resolvedDataSources[id] = resolvedData[1];

      ret.push(resolvedData);
    }

    return Object.fromEntries<Record<string, unknown[]>>(
      // @ts-ignore Figure out the type
      ret,
    );
  }

  return Promise.resolve({});
}

function getDependencies(
  resolvedDataSources: ResolvedDataSources,
  dependsOn?: DataSource["dependsOn"],
) {
  if (Array.isArray(dependsOn)) {
    const ret: ResolvedDataSources = {};

    dependsOn.forEach((dependencyName) => {
      ret[dependencyName] = resolvedDataSources[dependencyName];
    });

    return ret;
  }

  return;
}

export { getContext };
