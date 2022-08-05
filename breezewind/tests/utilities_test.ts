import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("pass utilities to children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        children: {
          utility: "hello",
        },
      },
      utilities: {
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );
});

Deno.test("pass utilities to children with parameters", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        children: {
          utility: "hello",
          parameters: ["world"],
        },
      },
      utilities: {
        hello: (target: string) => `hello ${target}`,
      },
    }),
    "<div>hello world</div>",
  );
});

Deno.test("pass utilities to attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        attributes: {
          title: {
            utility: "hello",
          },
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

Deno.test("pass utilities to attributes with parameters", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        attributes: {
          title: {
            utility: "hello",
            parameters: ["world"],
          },
        },
        "children": "test",
      },
      utilities: {
        hello: (target: string) => `hello ${target}`,
      },
    }),
    '<div title="hello world">test</div>',
  );
});
