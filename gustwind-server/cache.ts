import type { Route } from "../types.ts";
import type { Component, Utilities } from "../breezewind/types.ts";

type ServeCache = {
  components: Record<string, Component>;
  layouts: Record<string, Component | Component[]>;
  scripts: Record<string, string>;
  routes: Record<string, Route>;
  pageUtilities: Utilities;
};

function getCache(): ServeCache {
  return {
    components: {},
    layouts: {},
    scripts: {},
    routes: {},
    pageUtilities: {},
  };
}

export { getCache };

export type { ServeCache };
