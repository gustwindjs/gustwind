import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("all local plugins are exposed as package subpath exports", async () => {
  const pluginsDirectory = path.join(rootDirectory, "plugins");
  const pluginEntries = await readdir(pluginsDirectory, { withFileTypes: true });
  const pluginNames = (
    await Promise.all(
      pluginEntries
        .filter((entry) => entry.isDirectory())
        .map(async ({ name }) => {
          const files = await readdir(path.join(pluginsDirectory, name));
          return files.includes("mod.ts") ? name : undefined;
        }),
    )
  )
    .filter(Boolean)
    .sort();

  const buildScript = await readFile(
    path.join(rootDirectory, "scripts", "build-npm-package.mjs"),
    "utf8",
  );

  const exposedPluginNames = [
    ...buildScript.matchAll(/exportPath:\s*"\.\/plugins\/([^"]+)"/g),
  ]
    .map(([, name]) => name)
    .filter((name) => name !== "edge-router")
    .sort();

  const missingPluginNames = pluginNames.filter((name) =>
    !exposedPluginNames.includes(name)
  );

  assert.deepEqual(missingPluginNames, []);
});

test("gustwind package build completes", async () => {
  await execFileAsync(
    process.execPath,
    ["./scripts/build-npm-package.mjs", "gustwind", "0.0.0-test"],
    { cwd: rootDirectory },
  );
});
