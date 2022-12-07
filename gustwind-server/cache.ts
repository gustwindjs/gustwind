import type { Utilities } from "../breezewind/types.ts";

type ServeCache = {
  // TODO: Eliminate
  scripts: Record<string, string>;
  // TODO: Eliminate
  pageUtilities: Utilities;
};

function getCache(): ServeCache {
  return {
    scripts: {},
    pageUtilities: {},
  };
}

export { getCache };

export type { ServeCache };
