import { join } from "https://deno.land/std@0.107.0/path/mod.ts";
import type { DataSource, ProjectMeta } from "../types.ts";
import { transform } from "./transform.ts";

async function getContext(
  dataSourcesPath: ProjectMeta["paths"]["dataSources"],
  transformsPath: ProjectMeta["paths"]["transforms"],
  dataSources?: DataSource[],
) {
  if (dataSources) {
    if (!Array.isArray(dataSources)) {
      throw new Error("Data sources are not defined as an array");
    }

    return await Promise.all(
      // @ts-ignore: Figure out how the type
      dataSources.map(({ id, operation, input, transformWith }) => {
        const dataSourcePath = join(dataSourcesPath, `${operation}.ts`);

        return import("file://" + dataSourcePath).then(async (
          o,
        ) => [
          id,
          await transform(
            transformsPath,
            transformWith,
            await o.default(input),
          ),
        ]);
      }),
    ).then((
      dataSources,
    ) =>
      Object.fromEntries<Record<string, unknown[]>>(
        // @ts-ignore Figure out the type
        dataSources,
      )
    );
  }

  return Promise.resolve({});
}

export { getContext };
