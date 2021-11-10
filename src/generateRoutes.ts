import { dir, getJsonSync } from "../utils/fs.ts";
import { get } from "../utils/functional.ts";
import type { DataContext, Page } from "../types.ts";
import { transform } from "./transform.ts";

async function generateRoutes(
  { transformsPath, renderPage, pagesPath }: {
    transformsPath: string;
    renderPage: (
      route: string,
      path: string,
      page: Page,
      context: DataContext,
    ) => void;
    pagesPath: string;
    siteName: string;
  },
) {
  const pages = (await dir(pagesPath, ".json")).map((meta) => ({
    meta,
    // TODO: Can this become async?
    page: getJsonSync<Page>(meta.path) as Page,
  }));
  const paths: Record<
    string,
    { route: string; page: Page }
  > = {};
  const routes: string[] = [];

  await Promise.all(pages.map(async ({ page, meta: { name, path } }) => {
    const { dataSources, matchBy } = page;
    let rootPath = name.split(".").slice(0, -1).join(".");
    rootPath = rootPath === "index" ? "" : rootPath;

    // TODO: If data sources are defined but not an array, give a nice error
    if (dataSources && Array.isArray(dataSources) && matchBy) {
      await Promise.all(
        // @ts-ignore: Figure out how the type
        dataSources.map(({ id, operation, input, transformWith }) =>
          import(`../dataSources/${operation}.ts`).then(async (
            o,
          ) => [
            id,
            await transform(
              transformsPath,
              transformWith,
              await o.default(input),
            ),
          ])
        ),
      ).then((
        dataSources,
      ) => {
        const pageData = Object.fromEntries<Record<string, unknown[]>>(
          // @ts-ignore Figure out the type
          dataSources,
        );

        if (rootPath.startsWith("[") && rootPath.endsWith("]")) {
          const routerPath = rootPath.slice(1, -1);

          if (matchBy) {
            const dataSource = pageData[matchBy.dataSource];

            if (!dataSource) {
              console.error("Missing data source", pageData, matchBy);

              return;
            }

            const property = matchBy.property;
            Object.values(dataSource[matchBy.collection]).forEach((match) => {
              const route = `${routerPath ? "/" + routerPath : ""}/${
                get(match, property)
              }/`;

              renderPage(
                route,
                path,
                page,
                { match },
              );

              paths[path] = { route, page };
              routes.push(route);
            });
          } else {
            console.warn(`Path ${rootPath} is missing a matchBy`);
          }
        } else {
          throw new Error("Tried to matchBy a path that is not matchable");
        }
      });
    } else {
      const route = `${rootPath ? "/" + rootPath : ""}/`;

      renderPage(route, path, page, {});

      paths[path] = { route, page };
      routes.push(route);
    }
  }));

  return { paths, routes };
}

export { generateRoutes };
