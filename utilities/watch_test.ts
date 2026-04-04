import { delay } from "https://deno.land/std@0.207.0/async/delay.ts";
import { assertEquals } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.207.0/testing/mock.ts";
import { watch } from "./watch.ts";

class FakeFsWatcher implements AsyncIterable<Deno.FsEvent> {
  closed = false;
  #queue: Deno.FsEvent[] = [];
  #resolvers: ((value: IteratorResult<Deno.FsEvent>) => void)[] = [];

  emit(event: Deno.FsEvent) {
    if (this.closed) {
      return;
    }

    const resolver = this.#resolvers.shift();

    if (resolver) {
      resolver({ value: event, done: false });

      return;
    }

    this.#queue.push(event);
  }

  close() {
    this.closed = true;

    while (this.#resolvers.length) {
      this.#resolvers.shift()?.({ value: undefined as never, done: true });
    }
  }

  async next(): Promise<IteratorResult<Deno.FsEvent>> {
    const event = this.#queue.shift();

    if (event) {
      return { value: event, done: false };
    }

    if (this.closed) {
      return { value: undefined as never, done: true };
    }

    return await new Promise((resolve) => this.#resolvers.push(resolve));
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

Deno.test("watch restarts the fs watcher when new paths are added", async () => {
  const watcherCalls: string[][] = [];
  const watchers: FakeFsWatcher[] = [];
  const seenPaths: string[] = [];
  const existingPaths = new Set(["/initial", "/added"]);

  const lstatStub = stub(Deno, "lstat", (path: string | URL) => {
    const normalizedPath = typeof path === "string" ? path : path.pathname;

    if (!existingPaths.has(normalizedPath)) {
      throw new Deno.errors.NotFound("missing");
    }

    return Promise.resolve({} as Deno.FileInfo);
  });
  const watchFsStub = stub(Deno, "watchFs", (paths: string | string[]) => {
    const normalizedPaths = Array.isArray(paths) ? paths : [paths];
    watcherCalls.push([...normalizedPaths]);

    const watcher = new FakeFsWatcher();
    watchers.push(watcher);

    return watcher as unknown as Deno.FsWatcher;
  });

  try {
    const watcher = await watch({
      paths: ["/initial"],
      debounceDelay: 1,
      onChange: (path) => seenPaths.push(path),
    });

    assertEquals(watcherCalls, [["/initial"]]);

    const changed = await watcher.addPaths(["/initial", "/added"]);

    assertEquals(changed, true);
    assertEquals(watcherCalls, [["/initial"], ["/initial", "/added"]]);
    assertEquals(watchers[0].closed, true);

    watchers[1].emit({ kind: "modify", paths: ["/added"] });
    await delay(10);

    assertEquals(seenPaths, ["/added"]);

    watcher.close();
    assertEquals(watchers[1].closed, true);
  } finally {
    watchFsStub.restore();
    lstatStub.restore();
  }
});

Deno.test("watch ignores missing and remote paths", async () => {
  const watcherCalls: string[][] = [];

  const lstatStub = stub(Deno, "lstat", (path: string | URL) => {
    const normalizedPath = typeof path === "string" ? path : path.pathname;

    if (normalizedPath === "/valid") {
      return Promise.resolve({} as Deno.FileInfo);
    }

    throw new Deno.errors.NotFound("missing");
  });
  const watchFsStub = stub(Deno, "watchFs", (paths: string | string[]) => {
    const normalizedPaths = Array.isArray(paths) ? paths : [paths];
    watcherCalls.push([...normalizedPaths]);

    return new FakeFsWatcher() as unknown as Deno.FsWatcher;
  });

  try {
    const watcher = await watch({
      paths: ["http://example.com/file.ts", "/missing", "/valid"],
      onChange: () => {},
    });

    assertEquals(watcherCalls, [["/valid"]]);
    watcher.close();
  } finally {
    watchFsStub.restore();
    lstatStub.restore();
  }
});
