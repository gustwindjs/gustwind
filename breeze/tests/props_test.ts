import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("props binding without children", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", props: { value: "foobar" } },
    }),
    "<span></span>",
  );
});

Deno.test("props binding to children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { title: "foobar" },
        __children: "title",
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("props binding to ==children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { title: "foo" },
        "==children": "title + 'bar'",
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("props binding to ==children using context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { title: "foo" },
        "==children": "title + context.demo",
      },
      context: {
        demo: "bar",
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("props binding with attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { __title: "title" },
        props: {
          title: "demo",
        },
      },
    }),
    '<span title="demo"></span>',
  );
});

Deno.test("props binding with attributes using context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { "==title": "title + context.demo" },
        props: {
          title: "demo",
        },
      },
      context: {
        demo: "bar",
      },
    }),
    '<span title="demobar"></span>',
  );
});

Deno.test("component with props", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button", props: { children: "demo" } },
      components: { Button: { element: "button", __children: "children" } },
    }),
    "<button>demo</button>",
  );
});

// TODO: Test props (Link) within composition (siteIndex -> BaseLayout)
