import { matchRoute } from "../../utilities/matchRoute.ts";
import type { Plugin, Route } from "../../types.ts";

type Routes = Record<string, Route>;

const plugin: Plugin<{
  // TODO: Likely Route is too broad type here but it will do for now
  routes: Record<string, Route>;
}> = {
  meta: {
    name: "edge-router-plugin",
    description:
      "${name} implements a small router for the edge that does not depend on the file system.",
    dependsOn: [],
  },
  init({ options: { routes } }) {
    return {
      getAllRoutes: () => {
        return {
          routes,
          tasks: [],
        };
      },
      matchRoute: (allRoutes: Routes, url: string) => {
        const matchedRoute = matchRoute(allRoutes, url);

        if (matchedRoute) {
          return { route: allRoutes[url], tasks: [], allRoutes };
        }

        throw new Error(
          `edge-router-plugin - Match for url ${url} was not found`,
        );
      },
    };
  },
};

export { plugin };
