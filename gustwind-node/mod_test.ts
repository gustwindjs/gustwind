import * as path from "node:path";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { plugin as metaPlugin } from "../plugins/meta/mod.ts";
import { plugin as tailwindPlugin } from "../plugins/tailwind/mod.ts";
import { plugin as rendererPlugin } from "../renderers/htmlisp-renderer/mod.ts";
import { plugin as edgeRendererPlugin } from "../renderers/htmlisp-edge-renderer/mod.ts";
import { plugin as edgeRouterPlugin } from "../routers/edge-router/mod.ts";
import { stopModuleBundler } from "../load-adapters/node.ts";
import type { GlobalUtilities, Route } from "../types.ts";
import { initNodeRender, initRender } from "./mod.ts";

test("gustwind-node renders with in-memory edge-compatible plugins", async () => {
  const globalUtilities: GlobalUtilities = {
    init: () => ({
      shout(input: string) {
        return String(input).toUpperCase();
      },
    }),
  };
  const routes: Record<string, Route> = {
    "/": {
      layout: "Home",
      context: {
        headline: "hello from gustwind",
      },
    },
  };
  const render = await initRender([
    [edgeRouterPlugin, { routes }],
    [metaPlugin, { meta: { siteName: "Gustwind", title: "Home" } }],
    [
      edgeRendererPlugin,
      {
        components: {
          Home:
            `<main><h1 &children="meta.title"></h1><p &children="(shout (get context headline))"></p><small &children="meta.siteName"></small></main>`,
        },
        componentUtilities: {},
        globalUtilities,
      },
    ],
  ]);

  const { markup, tasks } = await render("/", {});

  assert.match(markup, /<h1>Home<\/h1>/);
  assert.match(markup, /<p>HELLO FROM GUSTWIND<\/p>/);
  assert.match(markup, /<small>Gustwind<\/small>/);
  assert.deepEqual(tasks, []);
});

test("gustwind-node renders from disk through the node load adapter", async () => {
  await withTempProject(async (cwd) => {
    const componentsDirectory = path.join(cwd, "components");
    const utilitiesDirectory = path.join(cwd, "utilities");
    await mkdir(componentsDirectory, { recursive: true });
    await mkdir(utilitiesDirectory, { recursive: true });
    await writeFile(
      path.join(componentsDirectory, "Home.html"),
      `<main><h1 &children="meta.title"></h1><p &children="(shout (get context headline))"></p><small &children="meta.siteName"></small></main>`,
    );
    await writeFile(
      path.join(utilitiesDirectory, "format.ts"),
      `export function format(input: string) { return String(input).toUpperCase(); }`,
    );
    await writeFile(
      path.join(cwd, "globalUtilities.ts"),
      [
        `import { format } from "./utilities/format.ts";`,
        `function init() {`,
        `  return { shout(input: string) { return format(input); } };`,
        `}`,
        `export { init };`,
      ].join("\n"),
    );

    const { markup } = await renderHome({
      cwd,
      globalUtilitiesPath: "./globalUtilities.ts",
      headline: "loaded from disk",
      title: "Disk Render",
    });

    assert.match(markup, /<h1>Disk Render<\/h1>/);
    assert.match(markup, /<p>LOADED FROM DISK<\/p>/);
    assert.match(markup, /<small>Gustwind<\/small>/);
  });
});

test("gustwind-node renders through remote imports in node-loaded modules", async (t) => {
  const remoteModules = new Map<string, string>([
    [
      "/remote/message.ts",
      [
        `import { prefix } from "./prefix.ts";`,
        `export function format(input: string) {`,
        `  return prefix + String(input).toUpperCase();`,
        `}`,
      ].join("\n"),
    ],
    [
      "/remote/prefix.ts",
      `export const prefix = "REMOTE:";`,
    ],
  ]);
  const server = createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
    const source = remoteModules.get(pathname);

    if (!source) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": "application/typescript" });
    response.end(source);
  });

  try {
    try {
      server.listen(0, "127.0.0.1");
      await Promise.race([
        once(server, "listening"),
        once(server, "error").then(([error]) => Promise.reject(error)),
      ]);
    } catch (error) {
      if (
        error instanceof Error && "code" in error &&
        error.code === "EPERM"
      ) {
        t.skip("sandbox does not allow opening a localhost test server");
        return;
      }

      throw error;
    }

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server port");
    }

    const { port } = address;
    await withTempProject(async (cwd) => {
      const componentsDirectory = path.join(cwd, "components");
      await mkdir(componentsDirectory, { recursive: true });
      await writeFile(
        path.join(componentsDirectory, "Home.html"),
        `<main><p &children="(shout (get context headline))"></p></main>`,
      );
      await writeFile(
        path.join(cwd, "globalUtilities.ts"),
        [
          `import { format } from "http://127.0.0.1:${port}/remote/message.ts";`,
          `function init() {`,
          `  return { shout(input: string) { return format(input); } };`,
          `}`,
          `export { init };`,
        ].join("\n"),
      );

      const { markup } = await renderHome({
        cwd,
        globalUtilitiesPath: "./globalUtilities.ts",
        headline: "from remote import",
        title: "Remote Render",
      });

      assert.match(markup, /<p>REMOTE:FROM REMOTE IMPORT<\/p>/);
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("gustwind-node loads initial plugins from module paths", async () => {
  try {
    const render = await initNodeRender({
      cwd: process.cwd(),
      initialPlugins: [
        ["./routers/edge-router/mod.ts", {
          routes: {
            "/": {
              layout: "Home",
              context: { headline: "path loaded" },
            },
          },
        }],
        ["./plugins/meta/mod.ts", { meta: { title: "Path Render" } }],
        [
          "./renderers/htmlisp-edge-renderer/mod.ts",
          {
            components: {
              Home:
                `<main><h1 &children="meta.title"></h1><p &children="(shout (get context headline))"></p></main>`,
            },
            componentUtilities: {},
            globalUtilities: {
              init: () => ({
                shout(input: string) {
                  return String(input).toUpperCase();
                },
              }),
            },
          },
        ],
      ],
    });
    const { markup } = await render("/", {});

    assert.match(markup, /<h1>Path Render<\/h1>/);
    assert.match(markup, /<p>PATH LOADED<\/p>/);
  } finally {
    await stopModuleBundler();
  }
});

test("gustwind tailwind plugin reuses compiled css across cold plugin instances", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-tailwind-plugin-"));

  try {
    await writeFile(
      path.join(cwd, "tailwind.css"),
      "@tailwind utilities;\n",
    );
    await writeFile(
      path.join(cwd, "tailwindSetup.ts"),
      [
        "export default {",
        "  content: [{ raw: '<div class=\"text-red-500\"></div>', extension: 'html' }],",
        "  theme: { extend: {} },",
        "  plugins: [],",
        "};",
      ].join("\n"),
    );

    let firstInstanceReads = 0;
    const firstApi = await tailwindPlugin.init({
      cwd,
      mode: "production",
      options: {
        cssPath: "./tailwind.css",
        setupPath: "./tailwindSetup.ts",
      },
      outputDirectory: "",
      renderComponent: async () => "",
      renderComponentSync: () => "",
      load: {
        async dir() {
          return [];
        },
        async json() {
          throw new Error("unused");
        },
        async module() {
          throw new Error("unused");
        },
        async textFile(filePath: string) {
          firstInstanceReads++;
          return await readFile(filePath, "utf8");
        },
        textFileSync() {
          throw new Error("unused");
        },
      },
    });

    await firstApi.prepareContext?.({
      send: async () => undefined,
      route: { layout: "Home" },
      url: "/",
      pluginContext: {},
    });
    const firstMarkup = (await firstApi.afterEachRender?.({
      markup: "<html><head></head><body></body></html>",
      context: {},
      route: { layout: "Home" },
      send: async () => undefined,
      url: "/",
      pluginContext: {},
    }))?.markup;
    const firstFinishTasks = await firstApi.finishBuild?.({
      send: async () => undefined,
      pluginContext: {},
    });

    let secondInstanceReads = 0;
    const secondApi = await tailwindPlugin.init({
      cwd,
      mode: "production",
      options: {
        cssPath: "./tailwind.css",
        setupPath: "./tailwindSetup.ts",
      },
      outputDirectory: "",
      renderComponent: async () => "",
      renderComponentSync: () => "",
      load: {
        async dir() {
          return [];
        },
        async json() {
          throw new Error("unused");
        },
        async module() {
          throw new Error("unused");
        },
        async textFile(filePath: string) {
          secondInstanceReads++;
          return await readFile(filePath, "utf8");
        },
        textFileSync() {
          throw new Error("unused");
        },
      },
    });

    await secondApi.prepareContext?.({
      send: async () => undefined,
      route: { layout: "Home" },
      url: "/",
      pluginContext: {},
    });
    const secondMarkup = (await secondApi.afterEachRender?.({
      markup: "<html><head></head><body></body></html>",
      context: {},
      route: { layout: "Home" },
      send: async () => undefined,
      url: "/",
      pluginContext: {},
    }))?.markup;
    const emittedCssFile = firstFinishTasks?.[0]?.type === "writeFile"
      ? firstFinishTasks[0].payload.file
      : "";
    const emittedCss = firstFinishTasks?.[0]?.type === "writeFile"
      ? String(firstFinishTasks[0].payload.data)
      : "";

    assert.equal(firstInstanceReads, 1);
    assert.equal(secondInstanceReads, 0);
    assert.equal(firstMarkup, secondMarkup);
    assert.match(emittedCssFile, /^tailwind-[0-9a-f]{12}\.css$/);
    assert.match(firstMarkup || "", new RegExp(`href="/${emittedCssFile}"`));
    assert.doesNotMatch(firstMarkup || "", /<style/);
    assert.match(emittedCss, /text-red-500/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

async function renderHome(
  {
    cwd,
    globalUtilitiesPath,
    headline,
    title,
  }: {
    cwd: string;
    globalUtilitiesPath: string;
    headline: string;
    title: string;
  },
) {
  const routes: Record<string, Route> = {
    "/": {
      layout: "Home",
      context: { headline },
    },
  };
  const render = await initNodeRender({
    cwd,
    initialPlugins: [
      [edgeRouterPlugin, { routes }],
      [metaPlugin, { meta: { title, siteName: "Gustwind" } }],
      [
        rendererPlugin,
        {
          components: [{ path: "./components" }],
          globalUtilitiesPath,
        },
      ],
    ],
  });

  return await render("/", {});
}

async function withTempProject(fn: (cwd: string) => Promise<void>) {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-"));

  try {
    await fn(cwd);
  } finally {
    await stopModuleBundler();
    await rm(cwd, { recursive: true, force: true });
  }
}
