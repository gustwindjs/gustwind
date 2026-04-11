import * as path from "node:path";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildNode } from "./build.ts";

test("gustwind-node builds a site from path-based plugins", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-"));

  try {
    await mkdir(path.join(cwd, "public"), { recursive: true });
    await writeFile(
      path.join(cwd, "public", "copied.txt"),
      "copied\n",
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies static routes for the Node build test.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
        context: { message: "home" },
      },
      "feed.xml": {
        layout: "Feed",
        context: { message: "feed" },
      },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
        if (url === "/feed.xml/") {
          return routes["feed.xml"];
        }
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders simple HTML/XML output for the Node build test.",
  },
  init() {
    return {
      prepareContext({ route, url }) {
        return {
          context: {
            ...(route.context || {}),
            url,
          },
        };
      },
      renderLayout({ route, context, url }) {
        if (url.endsWith(".xml/")) {
          return \`<feed>\${context.message}</feed>\`;
        }

        return \`<html><body><h1>\${route.layout}</h1><p>\${context.message}</p></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "assets-plugin.ts"),
      `
import * as path from "node:path";

export const plugin = {
  meta: {
    name: "test-assets-plugin",
    description: "Emits extra output files for the Node build test.",
  },
  init({ cwd, outputDirectory }) {
    return {
      prepareBuild() {
        return [{
          type: "writeTextFile",
          payload: {
            outputDirectory,
            file: path.join("assets", "hello.txt"),
            data: "hello\\n",
          },
        }];
      },
      finishBuild() {
        return [{
          type: "copyFiles",
          payload: {
            inputDirectory: path.join(cwd, "public"),
            outputDirectory,
            outputPath: "copied",
          },
        }];
      },
    };
  },
};
`.trimStart(),
    );

    const outputDirectory = path.join(cwd, "dist");

    await buildNode({
      cwd,
      outputDirectory,
      pluginDefinitions: [
        { path: "./router-plugin.ts", options: {}, module: undefined as never },
        { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
        { path: "./assets-plugin.ts", options: {}, module: undefined as never },
      ],
    });

    assert.equal(
      await readFile(path.join(outputDirectory, "index.html"), "utf8"),
      "<html><body><h1>Page</h1><p>home</p></body></html>",
    );
    assert.equal(
      await readFile(path.join(outputDirectory, "feed.xml"), "utf8"),
      "<feed>feed</feed>",
    );
    assert.equal(
      await readFile(path.join(outputDirectory, "assets", "hello.txt"), "utf8"),
      "hello\n",
    );
    assert.equal(
      await readFile(path.join(outputDirectory, "copied", "copied.txt"), "utf8"),
      "copied\n",
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
