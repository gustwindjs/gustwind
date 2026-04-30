import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
