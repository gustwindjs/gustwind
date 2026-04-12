import * as path from "node:path";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { buildNode } from "./build.ts";
import { CACHE_MANIFEST_PATH } from "../utilities/incrementalBuildCache.ts";

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

test("gustwind-node can validate generated HTML output", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-validate-"));

  try {
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies a route for HTML validation testing.",
  },
  init() {
    const routes = {
      "/": {
        layout: "Page",
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
    description: "Renders malformed HTML for validation testing.",
  },
  init() {
    return {
      renderLayout() {
        return "<html><body><a /></body></html>";
      },
    };
  },
};
`.trimStart(),
    );

    await assert.rejects(
      () =>
        buildNode({
          cwd,
          outputDirectory: path.join(cwd, "dist"),
          pluginDefinitions: [
            { path: "./router-plugin.ts", options: {}, module: undefined as never },
            { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
          ],
          validateOutput: true,
        }),
      /non-void-html-element-start-tag-with-trailing-solidus/,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node incrementally rebuilds only routes affected by changed inputs", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-incremental-"));

  try {
    await writeFile(path.join(cwd, "home.txt"), "home\n");
    await writeFile(path.join(cwd, "docs.txt"), "docs v1\n");
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
import * as path from "node:path";

export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies routes with route-specific file dependencies.",
  },
  init({ cwd, load }) {
    const routes = {
      "/": { layout: "Page" },
      docs: { layout: "Page" },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      async matchRoute(url) {
        if (url === "/") {
          return {
            ...routes["/"],
            context: {
              marker: "home",
              message: (await load.textFile(path.join(cwd, "home.txt"))).trim(),
            },
          };
        }

        if (url === "/docs/") {
          return {
            ...routes.docs,
            context: {
              marker: "docs",
              message: (await load.textFile(path.join(cwd, "docs.txt"))).trim(),
            },
          };
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
import * as path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Writes per-route markers so incremental rebuilds are observable.",
  },
  init({ cwd, outputDirectory }) {
    const countsPath = path.join(cwd, "render-counts.json");

    return {
      prepareContext({ route }) {
        return { context: route.context || {} };
      },
      async beforeEachRender({ context }) {
        let counts = {};

        try {
          counts = JSON.parse(await readFile(countsPath, "utf8"));
        } catch {
          counts = {};
        }

        const marker = context.marker;
        counts[marker] = (counts[marker] || 0) + 1;
        await writeFile(countsPath, JSON.stringify(counts), "utf8");

        return [{
          type: "writeTextFile",
          payload: {
            outputDirectory,
            file: path.join("markers", marker + ".txt"),
            data: String(counts[marker]),
          },
        }];
      },
      renderLayout({ context }) {
        return \`<html><body><p>\${context.message}</p></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );

    const outputDirectory = path.join(cwd, "dist-a");
    const secondOutputDirectory = path.join(cwd, "dist-b");
    const pluginDefinitions = [
      { path: "./router-plugin.ts", options: {}, module: undefined as never },
      { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
    ];

    const firstBuild = await buildNode({
      cwd,
      outputDirectory,
      pluginDefinitions,
      routeConcurrency: 1,
    });

    assert.equal(firstBuild.cacheHits, 0);
    assert.equal(firstBuild.routesBuilt, 2);
    assert.equal(
      await readFile(path.join(outputDirectory, "markers", "home.txt"), "utf8"),
      "1",
    );
    assert.equal(
      await readFile(path.join(outputDirectory, "markers", "docs.txt"), "utf8"),
      "1",
    );
    const firstManifest = JSON.parse(
      await readFile(path.join(outputDirectory, CACHE_MANIFEST_PATH), "utf8"),
    );

    assert.equal(firstManifest.schemaVersion, 3);
    assert.deepEqual(
      firstManifest.routes["/"].dependencyTasks.map(({ payload }: { payload: { path: string } }) =>
        payload.path
      ),
      ["home.txt"],
    );
    assert.deepEqual(
      firstManifest.routes["/docs/"].dependencyTasks.map(({ payload }: { payload: { path: string } }) =>
        payload.path
      ),
      ["docs.txt"],
    );

    await writeFile(path.join(cwd, "docs.txt"), "docs v2\n");

    const secondBuild = await buildNode({
      cwd,
      cacheFrom: outputDirectory,
      outputDirectory: secondOutputDirectory,
      pluginDefinitions,
      routeConcurrency: 1,
    });

    assert.equal(secondBuild.cacheHits, 1);
    assert.equal(secondBuild.routesBuilt, 1);
    assert.equal(
      await readFile(path.join(secondOutputDirectory, "markers", "home.txt"), "utf8"),
      "1",
    );
    assert.equal(
      await readFile(path.join(secondOutputDirectory, "markers", "docs.txt"), "utf8"),
      "2",
    );
    assert.match(
      await readFile(path.join(secondOutputDirectory, "docs", "index.html"), "utf8"),
      /docs v2/,
    );
    assert.match(
      await readFile(path.join(secondOutputDirectory, "index.html"), "utf8"),
      /home/,
    );
    await readFile(path.join(secondOutputDirectory, CACHE_MANIFEST_PATH), "utf8");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node incrementally rebuilds only routes affected by component dependency changes", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-components-"));

  try {
    const componentsDirectory = path.join(cwd, "components");
    await mkdir(componentsDirectory, { recursive: true });
    await writeFile(
      path.join(cwd, "globalUtilities.ts"),
      [
        "function init() {",
        "  return {};",
        "}",
        "export { init };",
      ].join("\n"),
    );
    await writeFile(
      path.join(componentsDirectory, "SharedShell.html"),
      `<main class="shell" &children="(get props children)"></main>`,
    );
    await writeFile(
      path.join(componentsDirectory, "HomeOnly.html"),
      `<p>home component</p>`,
    );
    await writeFile(
      path.join(componentsDirectory, "DocsOnly.html"),
      `<p>docs v1</p>`,
    );
    await writeFile(
      path.join(componentsDirectory, "HomeLayout.html"),
      `<html><body><SharedShell><HomeOnly></HomeOnly></SharedShell></body></html>`,
    );
    await writeFile(
      path.join(componentsDirectory, "DocsLayout.html"),
      `<html><body><SharedShell><DocsOnly></DocsOnly></SharedShell></body></html>`,
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies routes for component dependency invalidation testing.",
  },
  init() {
    const routes = {
      "/": { layout: "HomeLayout" },
      docs: { layout: "DocsLayout" },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }

        if (url === "/docs/") {
          return routes.docs;
        }
      },
    };
  },
};
`.trimStart(),
    );

    const outputDirectory = path.join(cwd, "dist-a");
    const secondOutputDirectory = path.join(cwd, "dist-b");
    const pluginDefinitions = [
      { path: "./router-plugin.ts", options: {}, module: undefined as never },
      {
        path: path.resolve("plugins/meta/mod.ts"),
        options: { meta: { siteName: "Gustwind" } },
        module: undefined as never,
      },
      {
        path: path.resolve("renderers/htmlisp-renderer/mod.ts"),
        options: {
          components: [{ path: "./components" }],
          globalUtilitiesPath: "./globalUtilities.ts",
        },
        module: undefined as never,
      },
    ];

    const firstBuild = await buildNode({
      cwd,
      outputDirectory,
      pluginDefinitions,
      routeConcurrency: 1,
    });

    assert.equal(firstBuild.cacheHits, 0);
    assert.equal(firstBuild.routesBuilt, 2);
    assert.match(
      await readFile(path.join(outputDirectory, "index.html"), "utf8"),
      /home component/,
    );
    assert.match(
      await readFile(path.join(outputDirectory, "docs", "index.html"), "utf8"),
      /docs v1/,
    );
    const firstManifest = JSON.parse(
      await readFile(path.join(outputDirectory, CACHE_MANIFEST_PATH), "utf8"),
    );

    assert.equal(firstManifest.schemaVersion, 3);
    assert.deepEqual(
      firstManifest.routes["/docs/"].dependencyTasks.map(({ payload }: { payload: { path: string } }) =>
        payload.path
      ),
      [
        "components/DocsLayout.html",
        "components/DocsOnly.html",
        "components/SharedShell.html",
      ],
    );

    await writeFile(
      path.join(componentsDirectory, "DocsOnly.html"),
      `<p>docs v2</p>`,
    );

    const secondBuild = await buildNode({
      cwd,
      cacheFrom: outputDirectory,
      outputDirectory: secondOutputDirectory,
      pluginDefinitions,
      routeConcurrency: 1,
    });

    assert.equal(secondBuild.cacheHits, 1);
    assert.equal(secondBuild.routesBuilt, 1);
    assert.equal(
      await readFile(path.join(secondOutputDirectory, "index.html"), "utf8"),
      await readFile(path.join(outputDirectory, "index.html"), "utf8"),
    );
    assert.match(
      await readFile(path.join(secondOutputDirectory, "docs", "index.html"), "utf8"),
      /docs v2/,
    );
    await readFile(path.join(secondOutputDirectory, CACHE_MANIFEST_PATH), "utf8");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node builds independent routes faster with route concurrency", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-parallel-"));

  try {
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies multiple routes for concurrency testing.",
  },
  init() {
    const routes = {
      "/": { layout: "Page", context: { message: "home" } },
      docs: { layout: "Page", context: { message: "docs" } },
      blog: { layout: "Page", context: { message: "blog" } },
      about: { layout: "Page", context: { message: "about" } },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }

        if (url === "/docs/") {
          return routes.docs;
        }

        if (url === "/blog/") {
          return routes.blog;
        }

        if (url === "/about/") {
          return routes.about;
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
    description: "Adds predictable async route render delay for concurrency testing.",
  },
  init() {
    return {
      async renderLayout({ context }) {
        await new Promise((resolve) => setTimeout(resolve, 80));

        return \`<html><body><p>\${context.message}</p></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );

    const pluginDefinitions = [
      { path: "./router-plugin.ts", options: {}, module: undefined as never },
      { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
    ];

    await buildNode({
      cwd,
      incremental: false,
      outputDirectory: path.join(cwd, "warmup"),
      pluginDefinitions,
      routeConcurrency: 4,
    });

    const sequentialStart = performance.now();
    await buildNode({
      cwd,
      incremental: false,
      outputDirectory: path.join(cwd, "sequential"),
      pluginDefinitions,
      routeConcurrency: 1,
    });
    const sequentialDuration = performance.now() - sequentialStart;

    const parallelStart = performance.now();
    await buildNode({
      cwd,
      incremental: false,
      outputDirectory: path.join(cwd, "parallel"),
      pluginDefinitions,
      routeConcurrency: 4,
    });
    const parallelDuration = performance.now() - parallelStart;

    assert.ok(
      parallelDuration < sequentialDuration * 0.75,
      `expected parallel build (${parallelDuration} ms) to improve over sequential build (${sequentialDuration} ms)`,
    );
    assert.ok(
      parallelDuration < sequentialDuration - 120,
      `expected parallel build (${parallelDuration} ms) to save substantial time over sequential build (${sequentialDuration} ms)`,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
