import { join } from "https://deno.land/std@0.107.0/path/mod.ts";
import { transform } from "./transform.ts";
import type { DataSource, Mode, ProjectMeta } from "../types.ts";

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

    return await Promise.all(
      // @ts-ignore: Figure out how the type
      dataSources.map(({ id, operation, input, transformWith }) => {
        const dataSourcePath = join(dataSourcesPath, `${operation}.ts`);

        return import(
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
