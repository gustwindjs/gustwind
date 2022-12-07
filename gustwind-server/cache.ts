type ServeCache = {
  // TODO: Eliminate
  scripts: Record<string, string>;
};

function getCache(): ServeCache {
  return {
    scripts: {},
  };
}

export { getCache };

export type { ServeCache };
