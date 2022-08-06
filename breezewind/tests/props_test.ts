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
        children: { context: "props", property: "title" },
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
        children: {
          utility: "concat",
          parameters: [{ context: "props", property: "title" }, "bar"],
        },
      },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
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
        children: {
          utility: "concat",
          parameters: [{ context: "props", property: "title" }, {
            context: "context",
            property: "demo",
          }],
        },
      },
      context: {
        demo: "bar",
      },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
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
        attributes: { title: { context: "props", property: "title" } },
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
        attributes: {
          title: {
            utility: "concat",
            parameters: [{ context: "props", property: "title" }, {
              context: "context",
              property: "demo",
            }],
          },
        },
        props: {
          title: "demo",
        },
      },
      context: {
        demo: "bar",
      },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
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
        Button: {
          element: "button",
          children: { context: "props", property: "children" },
        },
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
        Link: {
          element: "a",
          children: { context: "props", property: "children" },
        },
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
        Button: {
          element: { context: "props", property: "element" },
          children: "demo",
        },
      },
    }),
    "<div>demo</div>",
  );
});

Deno.test("evaluate element from props", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button" },
      components: {
        Button: {
          element: { context: "props", property: "element", "default": "a" },
          children: "demo",
        },
      },
    }),
    "<a>demo</a>",
  );
});

Deno.test("bind to context in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { title: { context: "context", property: "value" } },
        children: { context: "props", property: "title" },
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demo</span>",
  );
});

Deno.test("bind to a prop in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        props: { title: { context: "context", property: "value" } },
        children: [
          {
            element: "Button",
            props: {
              children: {
                context: "props",
                property: "title",
              },
            },
          },
        ],
      },
      components: {
        Button: {
          element: "button",
          children: {
            context: "props",
            property: "children",
          },
        },
      },
      context: {
        value: "propinpropdemo",
      },
    }),
    "<div><button>propinpropdemo</button></div>",
  );
});

Deno.test("evaluate to context in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: {
          title: {
            utility: "concat",
            parameters: [{ context: "context", property: "value" }, "bar"],
          },
        },
        children: {
          context: "props",
          property: "title",
        },
      },
      context: {
        value: "demo",
      },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "<span>demobar</span>",
  );
});

Deno.test("bind to a prop in a prop with utilities", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        props: { title: { context: "context", property: "value" } },
        children: [
          {
            element: "Button",
            props: {
              children: {
                utility: "concat",
                parameters: [{ context: "context", property: "title" }, "bar"],
              },
            },
          },
        ],
      },
      components: {
        Button: {
          element: "button",
          children: {
            context: "props",
            property: "children",
          },
        },
      },
      context: {
        value: "propinpropdemo",
      },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "<div><button>propinpropdemobar</button></div>",
  );
});
