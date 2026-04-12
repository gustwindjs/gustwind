import * as path from "node:path";
import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildClientAssets } from "./vite.ts";

test("buildClientAssets emits a Vite manifest and hashed browser entry", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-vite-build-"));

  try {
    await mkdir(path.join(cwd, "client"), { recursive: true });
    await writeFile(
      path.join(cwd, "client", "hello.ts"),
      `
const root = document.createElement("div");
root.textContent = "hello";
document.body.append(root);
`.trimStart(),
    );

    const outputDirectory = path.join(cwd, "dist");
    const result = await buildClientAssets({
      cwd,
      entries: {
        hello: "./client/hello.ts",
      },
      minify: false,
      outputDirectory,
    });

    assert.equal(Object.keys(result.entryFiles).length, 1);
    assert.match(result.entryFiles.hello, /^\/assets\/hello-[\w-]+\.js$/);
    await access(path.join(outputDirectory, result.entryFiles.hello.slice(1)));
    await access(path.join(outputDirectory, ".vite", "manifest.json"));

    const manifest = JSON.parse(
      await readFile(
        path.join(outputDirectory, ".vite", "manifest.json"),
        "utf8",
      ),
    ) as Record<string, { file: string; isEntry?: boolean }>;

    assert.deepEqual(result.manifest, manifest);
    const entryChunk = Object.values(manifest).find(({ isEntry }) => isEntry);

    assert.ok(entryChunk);
    assert.equal(entryChunk.isEntry, true);
    assert.equal(result.entryFiles.hello, `/${entryChunk.file}`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("buildClientAssets reuses a persistent cache across cold runs", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-vite-cache-"));

  try {
    await mkdir(path.join(cwd, "client"), { recursive: true });
    await writeFile(
      path.join(cwd, "client", "hello.ts"),
      `
const root = document.createElement("div");
root.textContent = "hello";
document.body.append(root);
`.trimStart(),
    );

    const firstOutputDirectory = path.join(cwd, "dist-a");
    const secondOutputDirectory = path.join(cwd, "dist-b");
    const persistentCache = {
      key: "test-cache-key",
      namespace: "vite-test",
    };

    const firstResult = await buildClientAssets({
      cwd,
      entries: {
        hello: "./client/hello.ts",
      },
      minify: false,
      outputDirectory: firstOutputDirectory,
      persistentCache,
    });
    const secondResult = await buildClientAssets({
      cwd,
      entries: {
        hello: "./client/hello.ts",
      },
      minify: false,
      outputDirectory: secondOutputDirectory,
      persistentCache,
    });

    assert.equal(firstResult.cacheHit, false);
    assert.equal(secondResult.cacheHit, true);
    assert.equal(firstResult.entryFiles.hello, secondResult.entryFiles.hello);
    await access(path.join(secondOutputDirectory, secondResult.entryFiles.hello.slice(1)));
    await access(path.join(secondOutputDirectory, ".vite", "manifest.json"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
