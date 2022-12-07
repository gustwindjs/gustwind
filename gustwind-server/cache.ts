import type { Component, Utilities } from "../breezewind/types.ts";

type ServeCache = {
  components: Record<string, Component>;
  layouts: Record<string, Component | Component[]>;
  scripts: Record<string, string>;
  pageUtilities: Utilities;
};

function getCache(): ServeCache {
  return {
    components: {},
    layouts: {},
    scripts: {},
    pageUtilities: {},
  };
}

export { getCache };

export type { ServeCache };
