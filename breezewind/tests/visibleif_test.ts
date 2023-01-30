import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";
import * as extensions from "../extensions.ts";

Deno.test("visibleIf causes empty render", async () => {
  assertEquals(
    await breeze({
      component: { type: "span", visibleIf: [] },
      extensions: [extensions.visibleIf],
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        visibleIf: [{ utility: "get", parameters: ["context", "visible"] }],
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span></span>",
  );
});

Deno.test("visibleIf shows a custom component", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Demo",
        visibleIf: [{ utility: "get", parameters: ["context", "visible"] }],
      },
      components: {
        Demo: {
          "type": "span",
          "children": "demo",
        },
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span>demo</span>",
  );
});

Deno.test("visibleIf hides a custom component", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Demo",
        visibleIf: [{ utility: "get", parameters: ["context", "visible"] }],
      },
      components: {
        Demo: {
          "type": "span",
          "children": "demo",
        },
      },
      extensions: [extensions.visibleIf],
      context: { visible: false },
    }),
    "",
  );
});

Deno.test("visibleIf hides element based on context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        visibleIf: [{ utility: "get", parameters: ["context", "visible"] }],
      },
      extensions: [extensions.visibleIf],
      context: { visible: false },
    }),
    "",
  );
});

Deno.test("visibleIf hides element based on context with an empty array", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        visibleIf: [{ utility: "get", parameters: ["context", "visible"] }],
      },
      extensions: [extensions.visibleIf],
      context: { visible: [] },
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on prop", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { foo: true },
        visibleIf: [{ utility: "get", parameters: ["props", "foo"] }],
      },
      extensions: [extensions.visibleIf],
    }),
    "<span></span>",
  );
});

Deno.test("visibleIf hides element based on prop", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { foo: false },
        visibleIf: [{ utility: "get", parameters: ["props", "foo"] }],
      },
      extensions: [extensions.visibleIf],
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on context and prop", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { foo: true },
        visibleIf: [
          { utility: "get", parameters: ["context", "visible"] },
          { utility: "get", parameters: ["props", "foo"] },
        ],
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span></span>",
  );
});
