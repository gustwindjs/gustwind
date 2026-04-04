import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.207.0/assert/mod.ts";
import { plugin as metaPlugin } from "../plugins/meta/mod.ts";
import { plugin as edgeRendererPlugin } from "../renderers/htmlisp-edge-renderer/mod.ts";
import { plugin as edgeRouterPlugin } from "../routers/edge-router/mod.ts";
import type { GlobalUtilities, Route } from "../types.ts";
import { initRender } from "./mod.ts";

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
