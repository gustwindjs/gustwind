import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";
import * as extensions from "../extensions.ts";

Deno.test("visibleIf causes empty render", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", visibleIf: [] },
      extensions: [extensions.visibleIf],
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        visibleIf: [{ context: "context", property: "visible" }],
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span></span>",
  );
});

Deno.test("visibleIf hides element based on context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        visibleIf: [{ context: "context", property: "visible" }],
      },
      extensions: [extensions.visibleIf],
      context: { visible: false },
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { foo: true },
        visibleIf: [{ context: "props", property: "foo" }],
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
        element: "span",
        props: { foo: false },
        visibleIf: [{ context: "props", property: "foo" }],
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
        element: "span",
        props: { foo: true },
        visibleIf: [
          { context: "context", property: "visible" },
          { context: "props", property: "foo" },
        ],
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span></span>",
  );
});
