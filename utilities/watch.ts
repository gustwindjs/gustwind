type Watch = {
  addPaths: (paths: string[]) => Promise<boolean>;
  close: () => void;
};

async function watch({
  paths,
  onChange,
  debounceDelay,
}: {
  paths: string[];
  onChange: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}): Promise<Watch> {
  let debounceTimer: number | undefined;
  let watcher: Deno.FsWatcher | undefined;
  let isClosed = false;
  const watchedPaths = new Set<string>();

  async function restartWatcher() {
    stopWatcher();

    if (isClosed) {
      return;
    }

    const pathsToWatch = await getPathsToWatch(Array.from(watchedPaths));

    if (!pathsToWatch.length) {
      return;
    }

    const nextWatcher = Deno.watchFs(pathsToWatch);
    watcher = nextWatcher;

    void (async () => {
      try {
        for await (const event of nextWatcher) {
          if (watcher !== nextWatcher || isClosed) {
            return;
          }

          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            if (watcher !== nextWatcher || isClosed) {
              return;
            }

            event.paths.forEach((path) => onChange(path, event));
            debounceTimer = undefined;
          }, debounceDelay || 200);
        }
      } catch (_) {
        // Closing the watcher during a restart can terminate the async iterator.
      }
    })();
  }

  async function addPaths(paths: string[]) {
    let changed = false;

    for (const path of normalizePaths(paths)) {
      if (!watchedPaths.has(path)) {
        watchedPaths.add(path);
        changed = true;
      }
    }

    if (changed) {
      await restartWatcher();
    }

    return changed;
  }

  function stopWatcher() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }

    if (watcher) {
      watcher.close();
      watcher = undefined;
    }
  }

  await addPaths(paths);

  return {
    addPaths,
    close() {
      isClosed = true;
      stopWatcher();
    },
  };
}

function normalizePaths(paths: string[]) {
  return paths.filter(Boolean).filter((path) => !path.startsWith("http"));
}

async function getPathsToWatch(paths: string[]) {
  // The watcher will crash hard if there's even a single invalid path.
  return (await Promise.all(
    normalizePaths(paths).map(async (path) => {
      try {
        await Deno.lstat(path);

        return path;
      } catch (_) {
        return;
      }
    }),
  )).filter(Boolean) as string[];
}

export { watch };
