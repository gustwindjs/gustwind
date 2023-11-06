import * as async from "https://deno.land/std@0.161.0/async/mod.ts";

async function watch({
  paths,
  onChange,
  debounceDelay,
}: {
  paths: string[];
  onChange: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}) {
  // The watcher will crash hard if there's even a single invalid path
  const pathsToWatch = (await Promise.all(
    paths.filter(Boolean).filter((p) => !p.startsWith("http")).map(
      async (p) => {
        try {
          await Deno.lstat(p);

          return p;
        } catch (_) {
          return;
        }
      },
    ),
  )).filter(Boolean) as string[];

  const watcher = Deno.watchFs(pathsToWatch);
  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => onChange(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { watch };
