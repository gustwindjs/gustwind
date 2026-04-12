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

test("gustwind-node builds route scripts through Vite assets and manifest output", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-vite-scripts-"));

  try {
    await mkdir(path.join(cwd, "scripts"), { recursive: true });
    await writeFile(
      path.join(cwd, "scripts", "hello.css"),
      "body { color: red; }\n",
    );
    await writeFile(
      path.join(cwd, "scripts", "hello.ts"),
      `
import "./hello.css";

console.log("hello from vite");
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies static routes for the Vite script build test.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
        scripts: [{ name: "hello" }],
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
    description: "Renders script/style tags for the Vite script build test.",
  },
  init() {
    return {
      renderLayout({ context }) {
        const styles = (context.styles || []).map(({ href, rel }) =>
          \`<link rel="\${rel}" href="\${href}">\`
        ).join("");
        const scripts = (context.scripts || []).map(({ src, type }) =>
          \`<script type="\${type}" src="\${src}"></script>\`
        ).join("");

        return \`<html><head>\${styles}</head><body>\${scripts}</body></html>\`;
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
        { path: path.resolve("plugins/script/mod.ts"), options: { scriptsPath: ["scripts"] }, module: undefined as never },
        { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
      ],
    });

    const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
    const scriptMatch = html.match(/<script type="module" src="([^"]+)"><\/script>/);
    const styleMatch = html.match(/<link rel="stylesheet" href="([^"]+)">/);

    assert.ok(scriptMatch);
    assert.ok(styleMatch);
    assert.match(scriptMatch[1], /^\/assets\/hello-[\w-]+\.js$/);
    assert.match(styleMatch[1], /^\/assets\/hello-[\w-]+\.css$/);
    await readFile(path.join(outputDirectory, scriptMatch[1].slice(1)), "utf8");
    await readFile(path.join(outputDirectory, styleMatch[1].slice(1)), "utf8");
    await readFile(path.join(outputDirectory, ".vite", "manifest.json"), "utf8");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
