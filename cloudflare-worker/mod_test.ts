import assert from "node:assert/strict";
import test from "node:test";
import { plugin as metaPlugin } from "../plugins/meta/mod.ts";
import { plugin as scriptPlugin } from "../plugins/script/mod.ts";
import { plugin as edgeRendererPlugin } from "../renderers/htmlisp-edge-renderer/mod.ts";
import { plugin as edgeRouterPlugin } from "../routers/edge-router/mod.ts";
import type { Route, Tasks } from "../types.ts";
import { createCloudflareWorker } from "./mod.ts";

function createExecutionContext() {
  const pending: Promise<unknown>[] = [];

  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
    },
    pending,
  };
}

test("cloudflare worker renders in-memory Gustwind routes", async () => {
  const routes: Record<string, Route> = {
    "/": {
      layout: "Home",
      context: {
        headline: "hello from worker",
      },
    },
  };
  const worker = createCloudflareWorker({
    initialPlugins: [
      [edgeRouterPlugin, { routes }],
      [metaPlugin, { meta: { title: "Worker Render" } }],
      [
        edgeRendererPlugin,
        {
          components: {
            Home:
              `<html><head></head><body><h1 &children="meta.title"></h1><p &children="(get context headline)"></p></body></html>`,
          },
          componentUtilities: {},
          globalUtilities: { init: () => ({}) },
        },
      ],
    ],
  });
  const { ctx } = createExecutionContext();
  const response = await worker.fetch(
    new Request("https://example.com/"),
    {},
    ctx,
  );
  const markup = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=UTF-8");
  assert.match(markup, /<h1>Worker Render<\/h1>/);
  assert.match(markup, /<p>hello from worker<\/p>/);
});

test("cloudflare worker injects route scripts from script asset manifest", async () => {
  const routes: Record<string, Route> = {
    "/": {
      layout: "Home",
      scripts: [{ name: "theme-toggle" }],
    },
  };
  const worker = createCloudflareWorker({
    initialPlugins: [
      [edgeRouterPlugin, { routes }],
      [
        scriptPlugin,
        {
          scripts: [{
            type: "text/javascript",
            src: "https://unpkg.com/sidewind@8.0.0/dist/sidewind.umd.production.min.js",
          }],
          scriptAssets: {
            "theme-toggle": {
              file: "/assets/theme-toggle-abc123.js",
              css: ["/assets/theme-toggle-abc123.css"],
            },
          },
        },
      ],
      [metaPlugin, { meta: { title: "Worker Render" } }],
      [
        edgeRendererPlugin,
        {
          components: {
            Home: [
              "<html><head>",
              '<noop &foreach="(get context styles)">',
              '<link &rel="(get props rel)" &href="(get props href)" />',
              "</noop>",
              "</head><body>",
              '<button data-theme-toggle="dark"></button>',
              '<noop &foreach="(get context scripts)">',
              '<script &type="(get props type)" &src="(get props src)"></script>',
              "</noop>",
              "</body></html>",
            ].join(""),
          },
          componentUtilities: {},
          globalUtilities: { init: () => ({}) },
        },
      ],
    ],
  });
  const { ctx } = createExecutionContext();
  const response = await worker.fetch(
    new Request("https://example.com/"),
    {},
    ctx,
  );
  const markup = await response.text();

  assert.equal(response.status, 200);
  assert.match(markup, /data-theme-toggle="dark"/);
  assert.match(markup, /<link rel="stylesheet" href="\/assets\/theme-toggle-abc123\.css">/);
  assert.match(
    markup,
    /<script type="text\/javascript" src="https:\/\/unpkg\.com\/sidewind@8\.0\.0\/dist\/sidewind\.umd\.production\.min\.js"><\/script>/,
  );
  assert.match(markup, /<script type="module" src="\/assets\/theme-toggle-abc123\.js"><\/script>/);
});

test("cloudflare worker prefers bound assets for file requests", async () => {
  const worker = createCloudflareWorker({
    async render(pathname) {
      return {
        markup: `<html><body>${pathname}</body></html>`,
        tasks: [],
      };
    },
  });
  const { ctx } = createExecutionContext();
  const response = await worker.fetch(
    new Request("https://example.com/app.css"),
    {
      ASSETS: {
        async fetch(request: Request) {
          return new URL(request.url).pathname === "/app.css"
            ? new Response("body { color: red; }", {
              headers: { "content-type": "text/css; charset=UTF-8" },
              status: 200,
            })
            : new Response("missing", { status: 404 });
        },
      },
    },
    ctx,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/css; charset=UTF-8");
  assert.equal(await response.text(), "body { color: red; }");
});

test("cloudflare worker can hand route tasks to waitUntil handlers", async () => {
  let handledTasks: Tasks | undefined;
  const worker = createCloudflareWorker({
    handleTasks({ tasks }) {
      handledTasks = tasks;
    },
    async render() {
      return {
        markup: '{"ok":true}',
        tasks: [{
          type: "writeFile",
          payload: {
            data: "hello",
            file: "data.txt",
            outputDirectory: "dist",
          },
        }],
      };
    },
  });
  const execution = createExecutionContext();
  const response = await worker.fetch(
    new Request("https://example.com/data.json"),
    {},
    execution.ctx,
  );

  await Promise.all(execution.pending);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=UTF-8");
  assert.deepEqual(handledTasks, [{
    type: "writeFile",
    payload: {
      data: "hello",
      file: "data.txt",
      outputDirectory: "dist",
    },
  }]);
});
