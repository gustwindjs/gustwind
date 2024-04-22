import { matchRoute } from "../matchRoute.ts";
import { trim } from "../../utilities/string.ts";
import type { Plugin, Route } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Likely Route is too broad type here but it will do for now
  routes: Record<string, Route>;
}, {
  // Dynamic routes are only urls as their contents are resolved otherwise
  dynamicRoutes: string[];
}> = {
  meta: {
    name: "edge-router-plugin",
    description:
      "${name} implements a small router for the edge that does not depend on the file system.",
    dependsOn: [],
  },
  init({ options: { routes } }) {
    return {
      initPluginContext: () => ({ dynamicRoutes: [] }),
      getAllRoutes: () => {
        return {
          routes,
          tasks: [],
        };
      },
      matchRoute: (url: string, pluginContext) => {
        if (pluginContext.dynamicRoutes.includes(trim(url, "/"))) {
          return;
        }

        return matchRoute(routes, url, {});
      },
      onMessage: ({ message, pluginContext }) => {
        const { type, payload } = message;

        if (type === "addDynamicRoute") {
          // TODO: Figure out why returning a concat doesn't patch the
          // state correctly (lifecycle issue?)
          pluginContext.dynamicRoutes.push(payload.path);
        }
      },
    };
  },
};

export { plugin };
