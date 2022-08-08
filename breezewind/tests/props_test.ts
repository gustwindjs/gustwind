import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("props binding without children", async () => {
  assertEquals(
    await breeze({
      component: { type: "span", props: { value: "foobar" } },
    }),
    "<span></span>",
  );
});

Deno.test("props binding to children", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { title: "foobar" },
        children: { utility: "get", parameters: ["props", "title"] },
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("props binding to children using utilities", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { title: "foo" },
        children: {
          utility: "concat",
          parameters: [
            { utility: "get", parameters: ["props", "title"] },
            "bar",
          ],
        },
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("props binding to children using context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        props: { title: "foo" },
        children: {
          utility: "concat",
          parameters: [
            { utility: "get", parameters: ["props", "title"] },
            { utility: "get", parameters: ["context", "demo"] },
          ],
        },
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
        type: "span",
        attributes: {
          title: { utility: "get", parameters: ["props", "title"] },
        },
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
        type: "span",
        attributes: {
          title: {
            utility: "concat",
            parameters: [
              { utility: "get", parameters: ["props", "title"] },
              { utility: "get", parameters: ["context", "demo"] },
            ],
          },
        },
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
      component: { type: "Button", props: { children: "demobutton" } },
      components: {
        Button: {
          type: "button",
          children: { utility: "get", parameters: ["props", "children"] },
        },
      },
    }),
    "<button>demobutton</button>",
  );
});

Deno.test("component with props with another element", async () => {
  assertEquals(
    await breeze({
      component: { type: "Layout" },
      components: {
        Layout: { type: "div", children: [{ type: "Navigation" }] },
        Link: {
          type: "a",
          children: { utility: "get", parameters: ["props", "children"] },
        },
        Navigation: [{ type: "Link", props: { children: "zoozoo" } }],
      },
    }),
    "<div><a>zoozoo</a></div>",
  );
});

Deno.test("bind element from props", async () => {
  assertEquals(
    await breeze({
      component: { type: "Button", props: { type: "div" } },
      components: {
        Button: {
          type: { utility: "get", parameters: ["props", "type"] },
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
      component: { type: "Button" },
      components: {
        Button: {
          type: { utility: "get", parameters: ["props", "type", "a"] },
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
        type: "span",
        bindToProps: {
          title: { utility: "get", parameters: ["context", "value"] },
        },
        children: { utility: "get", parameters: ["props", "title"] },
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demo</span>",
  );
});

Deno.test("bind to context in a prop and use regular props", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        bindToProps: {
          title: { utility: "get", parameters: ["context", "value"] },
        },
        props: { demo: "bar" },
        children: {
          utility: "concat",
          parameters: [
            { utility: "get", parameters: ["props", "title"] },
            { utility: "get", parameters: ["props", "demo"] },
          ],
        },
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demobar</span>",
  );
});

Deno.test("bind to a prop in a prop", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        bindToProps: {
          title: { utility: "get", parameters: ["context", "value"] },
        },
        children: [
          {
            type: "Button",
            bindToProps: {
              children: { utility: "get", parameters: ["props", "title"] },
            },
          },
        ],
      },
      components: {
        Button: {
          type: "button",
          children: { utility: "get", parameters: ["props", "children"] },
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
        type: "span",
        bindToProps: {
          title: {
            utility: "concat",
            parameters: [
              { utility: "get", parameters: ["context", "value"] },
              "bar",
            ],
          },
        },
        children: { utility: "get", parameters: ["props", "title"] },
      },
      context: {
        value: "demo",
      },
    }),
    "<span>demobar</span>",
  );
});

Deno.test("bind to a prop in a prop with utilities", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        bindToProps: {
          title: { utility: "get", parameters: ["context", "value"] },
        },
        children: [
          {
            type: "Button",
            bindToProps: {
              children: {
                utility: "concat",
                parameters: [{
                  utility: "get",
                  parameters: ["props", "title"],
                }, "bar"],
              },
            },
          },
        ],
      },
      components: {
        Button: {
          type: "button",
          children: { utility: "get", parameters: ["props", "children"] },
        },
      },
      context: {
        value: "propinpropdemo",
      },
    }),
    "<div><button>propinpropdemobar</button></div>",
  );
});
