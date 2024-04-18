import { matchRoute } from "../matchRoute.ts";
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
      matchRoute: (url: string) => {
        const matchedRoute = matchRoute(routes, url);

        if (matchedRoute) {
          return { route: routes[url], tasks: [] };
        }

        // This can happen for dynamically generated routes, for example pagefind
        return { route: undefined, tasks: [] };
      },
    };
  },
};

export { plugin };
