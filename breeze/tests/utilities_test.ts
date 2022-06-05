import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("pass utilities to ==children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        "==children": "utilities.hello()",
      },
      utilities: {
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );
});

Deno.test("pass utilities to attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        attributes: {
          "==title": "utilities.hello()",
        },
        "children": "test",
      },
      utilities: {
        hello: () => "hello",
      },
    }),
    '<div title="hello">test</div>',
  );
});
