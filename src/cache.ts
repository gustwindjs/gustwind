import type { ServeCache } from "./watch.ts";

function getCache(): ServeCache {
  return {
    contexts: {},
    components: {},
    layouts: {},
    layoutDefinitions: {},
    scripts: {},
    styles: {},
    routes: {},
    routeDefinitions: {},
  };
}

export { getCache };
