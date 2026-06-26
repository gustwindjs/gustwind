import {
  clearCachedOutputs,
  hashRouteFingerprint,
  outputsExist,
  restoreCachedOutputs,
} from "../utilities/incrementalBuildCache.ts";
import type { Route } from "../types.ts";
import type {
  IncrementalBuildCache,
  IncrementalBuildCacheSource,
  IncrementalBuildRouteCacheEntry,
} from "../utilities/incrementalBuildCache.ts";

type RestoreRouteBuildFromCacheOptions = {
  cwd: string;
  globalFingerprint: string | null;
  incrementalCache?: IncrementalBuildCache;
  incrementalCacheEnabled: boolean;
  incrementalCacheSource?: IncrementalBuildCacheSource;
  matchedRoute: Route;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  outputDirectory: string;
  url: string;
};

type UpdateRouteBuildCacheOptions = {
  cwd: string;
  dependencyTasks: IncrementalBuildRouteCacheEntry["dependencyTasks"];
  globalFingerprint: string | null;
  incrementalCacheEnabled: boolean;
  matchedRoute: Route;
  nextIncrementalCacheRoutes: Record<string, IncrementalBuildRouteCacheEntry>;
  outputPaths: string[];
  url: string;
};

async function restoreRouteBuildFromCache({
  cwd,
  globalFingerprint,
  incrementalCache,
  incrementalCacheEnabled,
  incrementalCacheSource,
  matchedRoute,
  nextIncrementalCacheRoutes,
  outputDirectory,
  url,
}: RestoreRouteBuildFromCacheOptions) {
  const previousRouteCache = incrementalCache?.routes[url];

  if (!previousRouteCache) {
    return false;
  }

  const previousRouteFingerprint = await hashRouteFingerprint(
    cwd,
    globalFingerprint,
    matchedRoute,
    previousRouteCache.dependencyTasks,
  );

  if (
    incrementalCacheSource &&
    (await canRestoreCachedRoute({
      incrementalCacheEnabled,
      incrementalCacheSource,
      previousRouteCache,
      previousRouteFingerprint,
    }))
  ) {
    await restoreCachedOutputs(
      incrementalCacheSource,
      outputDirectory,
      previousRouteCache.outputPaths,
    );
    nextIncrementalCacheRoutes[url] = previousRouteCache;
    return true;
  }

  await clearCachedOutputs(outputDirectory, previousRouteCache.outputPaths);

  return false;
}

async function canRestoreCachedRoute({
  incrementalCacheEnabled,
  incrementalCacheSource,
  previousRouteCache,
  previousRouteFingerprint,
}: {
  incrementalCacheEnabled: boolean;
  incrementalCacheSource: NonNullable<
    RestoreRouteBuildFromCacheOptions["incrementalCacheSource"]
  >;
  previousRouteCache: IncrementalBuildRouteCacheEntry;
  previousRouteFingerprint: string | null;
}) {
  if (!incrementalCacheEnabled || !incrementalCacheSource) {
    return false;
  }

  if (previousRouteFingerprint !== previousRouteCache.fingerprint) {
    return false;
  }

  return outputsExist(incrementalCacheSource, previousRouteCache.outputPaths);
}

async function updateRouteBuildCache({
  cwd,
  dependencyTasks,
  globalFingerprint,
  incrementalCacheEnabled,
  matchedRoute,
  nextIncrementalCacheRoutes,
  outputPaths,
  url,
}: UpdateRouteBuildCacheOptions) {
  if (!incrementalCacheEnabled) {
    return;
  }

  const fingerprint = await hashRouteFingerprint(
    cwd,
    globalFingerprint,
    matchedRoute,
    dependencyTasks,
  );

  if (fingerprint) {
    nextIncrementalCacheRoutes[url] = {
      dependencyTasks,
      fingerprint,
      outputPaths,
    };
  }
}

export { restoreRouteBuildFromCache, updateRouteBuildCache };
