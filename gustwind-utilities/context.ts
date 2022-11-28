// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import type {
  Context,
  DataSources,
  Meta,
  Mode,
  ProjectMeta,
  Route,
} from "../types.ts";
import type { Utilities } from "../breezewind/types.ts";
import { applyUtilities } from "../breezewind/applyUtility.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";

async function getContext(
  { dataSources, mode, pagePath, pageUtilities, projectMeta, route }: {
    dataSources: DataSources;
    mode: Mode;
    pagePath: string;
    pageUtilities: Utilities;
    projectMeta: ProjectMeta;
    route: Route;
  },
) {
  const runtimeMeta: Meta = { built: (new Date()).toString() };

  // The assumption here is that all the page scripts are compiled with Gustwind.
  // TODO: It might be a good idea to support third-party scripts here as well
  let pageScripts =
    route.scripts?.slice(0).map((s) => ({ type: "module", src: `/${s}.js` })) ||
    [];
  if (projectMeta.scripts) {
    pageScripts = pageScripts.concat(projectMeta.scripts);
  }
  if (mode === "development") {
    runtimeMeta.pagePath = pagePath;
  }
  const dataSourceContext = await getDataSourceContext(
    route.dataSources,
    dataSources,
  );
  const context: Context = {
    pagePath,
    projectMeta,
    scripts: pageScripts,
    ...route.context,
    ...dataSourceContext,
  };
  const props = {
    ...runtimeMeta,
    ...projectMeta.meta,
    ...route.meta,
  };
  context.meta = await applyUtilities(
    props,
    { ...defaultUtilities, ...pageUtilities } as Utilities,
    { context },
  );

  return context;
}

async function getDataSourceContext(
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
): Promise<Record<string, unknown>> {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  return Object.fromEntries(
    await Promise.all(
      dataSourceIds.map(async ({ name, operation, parameters }) => {
        const dataSource = dataSources[operation];

        if (!dataSource) {
          throw new Error(`Data source ${operation} was not found!`);
        }

        return [
          name,
          await dataSource.apply(
            undefined,
            // @ts-expect-error This is fine
            Array.isArray(parameters) ? parameters : [],
          ),
        ];
      }),
    ),
  );
}

export { getContext };
