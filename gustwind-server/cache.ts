import type { DataContext, Route } from "../types.ts";
import type { Component, Utilities } from "../breezewind/types.ts";

type ServeCache = {
  contexts: Record<string, DataContext>;
  components: Record<string, Component>;
  layoutDefinitions: Record<string, Component | Component[]>;
  layouts: Record<string, Component | Component[]>;
  scripts: Record<string, string>;
  routes: Record<string, Route>;
  routeDefinitions: Record<string, Route>;
  pageUtilities: Utilities;
  // TODO: Does twind setup have a better type?
  twindSetup: Record<string, unknown>;
};

function getCache(): ServeCache {
  return {
    contexts: {},
    components: {},
    layouts: {},
    layoutDefinitions: {},
    scripts: {},
    routes: {},
    routeDefinitions: {},
    pageUtilities: {},
    twindSetup: {},
  };
}

export { getCache };

export type { ServeCache };
