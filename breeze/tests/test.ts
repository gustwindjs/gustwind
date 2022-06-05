import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

const onlyChildren = { children: "testing" };
const emptySpan = { element: "span" };
const span = { element: "span", children: "testing" };
const undefinedAttribute = {
  element: "a",
  attributes: { href: undefined },
  children: "testing",
};
const hyperlinkWithoutChildren = {
  element: "a",
  attributes: { href: "testing" },
};

Deno.test("empty element", async () => {
  assertEquals(await breeze({ component: emptySpan }), "<span></span>");
});

Deno.test("array of elements", async () => {
  assertEquals(
    await breeze({ component: [emptySpan, emptySpan] }),
    "<span></span><span></span>",
  );
});

Deno.test("simple element", async () => {
  assertEquals(await breeze({ component: span }), "<span>testing</span>");
});

Deno.test("children element", async () => {
  assertEquals(await breeze({ component: onlyChildren }), "testing");
});

Deno.test("nested element", async () => {
  assertEquals(
    await breeze({ component: { element: "div", children: [span] } }),
    "<div><span>testing</span></div>",
  );
});

Deno.test("props binding without __children", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", props: { value: "foobar" } },
    }),
    "<span></span>",
  );
});

Deno.test("props binding to __children", async () => {
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

Deno.test("nested siblings", async () => {
  assertEquals(
    await breeze({ component: { element: "div", children: [span, span] } }),
    "<div><span>testing</span><span>testing</span></div>",
  );
});

Deno.test("nested children siblings", async () => {
  assertEquals(
    await breeze({
      component: { element: "div", children: [onlyChildren, onlyChildren] },
    }),
    "<div>testingtesting</div>",
  );
});

Deno.test("multi-level nesting", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        children: [{ element: "div", children: [span] }],
      },
    }),
    "<div><div><span>testing</span></div></div>",
  );
});

Deno.test("attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "a",
        attributes: { href: "testing", empty: "" },
        children: "testing",
      },
    }),
    '<a href="testing" empty>testing</a>',
  );
});

Deno.test("undefined attributes", async () => {
  assertEquals(
    await breeze({ component: undefinedAttribute }),
    "<a>testing</a>",
  );
});

Deno.test("attributes without children", async () => {
  assertEquals(
    await breeze({ component: hyperlinkWithoutChildren }),
    '<a href="testing"></a>',
  );
});

Deno.test("context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "context.test" },
      context: { test: "foobar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "context.meta.title" },
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within an array", async () => {
  assertEquals(
    await breeze({
      component: [{ element: "span", __children: "context.meta.title" }],
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within components", async () => {
  assertEquals(
    await breeze({
      component: { element: "BaseLayout", props: { content: "demo" } },
      components: {
        BaseLayout: [{
          element: "html",
          children: [{ element: "MetaFields" }],
        }],
        MetaFields: [{ element: "span", __children: "context.meta.title" }],
      },
      context: { meta: { title: "foobar" } },
    }),
    "<html><span>foobar</span></html>",
  );
});

Deno.test("context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "context.test" },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "context.test.test" },
      context: { test: { test: "foobar" } },
    }),
    "foobar",
  );
});

Deno.test("context evaluation", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", "==children": "context.test + 'bar'" },
      context: { test: "foo" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("async context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        "==children": "Promise.resolve('foobar')",
      },
      context: { test: "bar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context evaluation", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", "==children": "context.test.test + 'bar'" },
      context: { test: { test: "foo" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context evaluation without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "context.test + 'bar'" },
      context: { test: "foo" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "context.test.test + 'bar'" },
      context: { test: { test: "foo" } },
    }),
    "foobar",
  );
});

Deno.test("context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { __title: "context.test" },
        children: "test",
      },
      context: { test: "foobar" },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("nested context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { __title: "context.test.test" },
        children: "test",
      },
      context: { test: { test: "foobar" } },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { "==title": "context.test + 'bar'" },
        children: "test",
      },
      context: { test: "foo" },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { "==title": "Promise.resolve('foobar')" },
        "children": "test",
      },
      context: { test: "bar" },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("nested context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          "==title": "context.test.test + 'bar'",
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        "==children": "Promise.resolve('foobar')",
      },
      context: { test: "bar" },
    }),
    "<span>foobar</span>",
  );
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          "==title": "Promise.resolve('foobar')",
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("component lookup", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button" },
      components: { Button: { element: "button", children: "demo" } },
    }),
    "<button>demo</button>",
  );
});

Deno.test("component lookup with an array", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button" },
      components: {
        Button: [{ element: "button", children: "foo" }, {
          element: "button",
          children: "bar",
        }],
      },
    }),
    "<button>foo</button><button>bar</button>",
  );
});

Deno.test("component lookup with a complex structure", async () => {
  assertEquals(
    await breeze({
      component: [
        {
          "element": "head",
          "children": [
            {
              "element": "MetaFields",
            },
          ],
        },
      ],
      components: {
        MetaFields: [
          {
            "element": "link",
            "attributes": {
              "rel": "icon",
              "href": "bar",
            },
          },
        ],
      },
    }),
    '<head><link rel="icon" href="bar"></link></head>',
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

Deno.test("component with object props and render()", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: {
          element: "body",
          "==children": "render(content)",
        },
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props and render()", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: [
          {
            element: "body",
            "==children": "render(content)",
          },
        ],
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props, render(), and nested usage", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: [
          {
            element: "html",
            children: [
              {
                element: "body",
                "==children": "render(content)",
              },
            ],
          },
        ],
      },
    }),
    "<html><body>demo</body></html>",
  );
});

Deno.test("pass render() to ==children with context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        "==children": "render(context.demo)",
      },
      context: { demo: { element: "span", children: "foobar" } },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("pass render() to ==children with props", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        props: { demo: { element: "span", children: "foobar" } },
        "==children": "render(demo)",
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("pass render() to ==children with props in a component", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "Test",
        props: { demo: { element: "span", children: "foobar" } },
      },
      components: {
        Test: {
          element: "div",
          "==children": "render(demo)",
        },
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

// TODO: Test props (Link) within composition (siteIndex -> BaseLayout)

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

Deno.test("allow customizing closing character", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "!DOCTYPE",
        attributes: {
          html: "",
          __language: "context.meta.language",
        },
        closingCharacter: "",
      },
      context: {
        meta: {
          language: "en",
        },
      },
    }),
    '<!DOCTYPE html language="en" >',
  );
});

Deno.test("allow rendering xml heading", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "?xml",
        attributes: {
          version: "1.0",
          encoding: "UTF-8",
        },
        closingCharacter: "?",
      },
    }),
    '<?xml version="1.0" encoding="UTF-8" ?>',
  );
});
