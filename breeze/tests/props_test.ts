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
        __children: "props.title",
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
        "==children": "props.title + 'bar'",
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
        "==children": "props.title + context.demo",
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
        attributes: { __title: "props.title" },
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
        attributes: { "==title": "props.title + context.demo" },
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
      component: { element: "Button", props: { children: "demobutton" } },
      components: {
        Button: { element: "button", __children: "props.children" },
      },
    }),
    "<button>demobutton</button>",
  );
});

Deno.test("component with props with another element", async () => {
  assertEquals(
    await breeze({
      component: { element: "Layout" },
      components: {
        Layout: { element: "div", children: [{ element: "Navigation" }] },
        Link: { element: "a", __children: "props.children" },
        Navigation: [{ element: "Link", props: { children: "zoozoo" } }],
      },
    }),
    "<div><a>zoozoo</a></div>",
  );
});

Deno.test("bind element from props", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button", props: { element: "div" } },
      components: {
        Button: { __element: "props.element", children: "demo" },
      },
    }),
    "<div>demo</div>",
  );
});

Deno.test("bind to context in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { __title: "context.value" },
        __children: "props.title",
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demo</span>",
  );
});
// TODO: Test bind to context in a prop

Deno.test("evaluate to context in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { "==title": "context.value + 'bar'" },
        __children: "props.title",
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demobar</span>",
  );
});
// TODO: Test bind to a prop in a prop
