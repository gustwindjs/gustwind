import type { Component, DataContext, Layout, Route } from "../types.ts";

type ServeCache = {
  contexts: Record<string, DataContext>;
  components: Record<string, Component>;
  layoutDefinitions: Record<string, Layout>;
  layouts: Record<string, Layout>;
  scripts: Record<string, string>;
  styles: Record<string, string>;
  routes: Record<string, Route>;
  routeDefinitions: Record<string, Route>;
  pageUtilities: Record<string, unknown>;
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
    styles: {},
    routes: {},
    routeDefinitions: {},
    pageUtilities: {},
    twindSetup: {},
  };
}

export { getCache };

export type { ServeCache };
