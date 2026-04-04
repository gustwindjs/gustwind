import * as path from "node:path";
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { plugin as metaPlugin } from "../plugins/meta/mod.ts";
import { plugin as rendererPlugin } from "../renderers/htmlisp-renderer/mod.ts";
import { plugin as edgeRendererPlugin } from "../renderers/htmlisp-edge-renderer/mod.ts";
import { plugin as edgeRouterPlugin } from "../routers/edge-router/mod.ts";
import { stopModuleBundler } from "../load-adapters/node.ts";
import type { GlobalUtilities, Route } from "../types.ts";
import { initNodeRender, initRender } from "./mod.ts";

Deno.test("gustwind-node renders with in-memory edge-compatible plugins", async () => {
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

  assertStringIncludes(markup, "<h1>Home</h1>");
  assertStringIncludes(markup, "<p>HELLO FROM GUSTWIND</p>");
  assertStringIncludes(markup, "<small>Gustwind</small>");
  assertEquals(tasks, []);
});

Deno.test("gustwind-node renders from disk through the node load adapter", async () => {
  await withTempProject(async (cwd) => {
    const componentsDirectory = path.join(cwd, "components");
    const utilitiesDirectory = path.join(cwd, "utilities");
    await Deno.mkdir(componentsDirectory, { recursive: true });
    await Deno.mkdir(utilitiesDirectory, { recursive: true });
    await Deno.writeTextFile(
      path.join(componentsDirectory, "Home.html"),
      `<main><h1 &children="meta.title"></h1><p &children="(shout (get context headline))"></p><small &children="meta.siteName"></small></main>`,
    );
    await Deno.writeTextFile(
      path.join(utilitiesDirectory, "format.ts"),
      `export function format(input: string) { return String(input).toUpperCase(); }`,
    );
    await Deno.writeTextFile(
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

    assertStringIncludes(markup, "<h1>Disk Render</h1>");
    assertStringIncludes(markup, "<p>LOADED FROM DISK</p>");
    assertStringIncludes(markup, "<small>Gustwind</small>");
  });
});

Deno.test("gustwind-node renders through remote imports in node-loaded modules", async () => {
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
  const controller = new AbortController();
  let serverPromise: Promise<void> | undefined;

  try {
    const { port } = await new Promise<{ port: number }>((resolve) => {
      serverPromise = Deno.serve(
        {
          hostname: "127.0.0.1",
          port: 0,
          signal: controller.signal,
          onListen: ({ port }) => resolve({ port }),
        },
        (request) => {
          const pathname = new URL(request.url).pathname;
          const source = remoteModules.get(pathname);

          if (!source) {
            return new Response("Not found", { status: 404 });
          }

          return new Response(source, {
            headers: { "content-type": "application/typescript" },
          });
        },
      ).finished;
    });

    await withTempProject(async (cwd) => {
      const componentsDirectory = path.join(cwd, "components");
      await Deno.mkdir(componentsDirectory, { recursive: true });
      await Deno.writeTextFile(
        path.join(componentsDirectory, "Home.html"),
        `<main><p &children="(shout (get context headline))"></p></main>`,
      );
      await Deno.writeTextFile(
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

      assertStringIncludes(markup, "<p>REMOTE:FROM REMOTE IMPORT</p>");
    });
  } finally {
    controller.abort();
    await serverPromise?.catch(() => undefined);
  }
});

Deno.test("gustwind-node loads initial plugins from module paths", async () => {
  try {
    const render = await initNodeRender({
      cwd: Deno.cwd(),
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

    assertStringIncludes(markup, "<h1>Path Render</h1>");
    assertStringIncludes(markup, "<p>PATH LOADED</p>");
  } finally {
    await stopModuleBundler();
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
  const cwd = await Deno.makeTempDir({ prefix: "gustwind-node-" });

  try {
    await fn(cwd);
  } finally {
    await stopModuleBundler();
    await Deno.remove(cwd, { recursive: true });
  }
}
