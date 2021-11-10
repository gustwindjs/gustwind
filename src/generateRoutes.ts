import { dir, getJsonSync } from "../utils/fs.ts";
import { get } from "../utils/functional.ts";
import type { DataContext, Page } from "../types.ts";
import { getContext } from "./getContext.ts";

async function generateRoutes(
  { dataSourcesPath, transformsPath, renderPage, pagesPath }: {
    dataSourcesPath: string;
    transformsPath: string;
    renderPage: ({ route, path, page, context }: {
      route: string;
      path: string;
      page: Page;
      context: DataContext;
    }) => void;
    pagesPath: string;
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

    if (matchBy) {
      if (rootPath.startsWith("[") && rootPath.endsWith("]")) {
        const pageData = await getContext(
          dataSourcesPath,
          transformsPath,
          dataSources,
        );
        const dataSource = pageData[matchBy.dataSource];

        if (!dataSource) {
          console.error("Missing data source", pageData, matchBy);

          return;
        }

        const routerPath = rootPath.slice(1, -1);
        const property = matchBy.property;
        Object.values(dataSource[matchBy.collection]).forEach((match) => {
          const route = `${routerPath ? "/" + routerPath : ""}/${
            get(match, property)
          }/`;

          renderPage({
            route,
            path,
            page,
            context: { match },
          });

          paths[path] = { route, page };
          routes.push(route);
        });
      } else {
        throw new Error("Tried to matchBy a path that is not matchable");
      }
    } else {
      const route = `${rootPath ? "/" + rootPath : ""}/`;

      renderPage({ route, path, page, context: {} });

      paths[path] = { route, page };
      routes.push(route);
    }
  }));

  return { paths, routes };
}

export { generateRoutes };
