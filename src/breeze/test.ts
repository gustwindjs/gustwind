import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "./index.ts";
import * as extensions from "./extensions.ts";

const onlyChildren = { children: "testing" };
const emptySpan = { element: "span" };
const span = { element: "span", children: "testing" };
const hyperlink = {
  element: "a",
  attributes: { href: "testing" },
  children: "testing",
};
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
  assertEquals(await breeze({ component: emptySpan }), "<span />");
});

Deno.test("array of elements", async () => {
  assertEquals(
    await breeze({ component: [emptySpan, emptySpan] }),
    "<span /><span />",
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
    "<span />",
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
    '<span title="demo" />',
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
    '<span title="demobar" />',
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
    await breeze({ component: hyperlink }),
    '<a href="testing">testing</a>',
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
    '<a href="testing" />',
  );
});

Deno.test("context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "test" },
      context: { test: "foobar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "test.test" },
      context: { test: { test: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "test" },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "test.test" },
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

Deno.test("class shortcut extension", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", class: "demo", children: "testing" },
      extensions: [extensions.classShortcut],
    }),
    '<span class="demo">testing</span>',
  );
});

Deno.test("class shortcut extension with getter", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        __class: "context.demo",
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: { demo: "foobar" },
    }),
    '<span class="foobar">testing</span>',
  );
});

Deno.test("class shortcut extension with evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        "==class": "context.demo + 'bar'",
        children: "testing",
      },
      extensions: [extensions.classShortcut],
      context: { demo: "foo" },
    }),
    '<span class="foobar">testing</span>',
  );
});

Deno.test("foreach extension without context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["items", { element: "li", __children: "value" }],
      },
      extensions: [extensions.foreach],
    }),
    "<ul />",
  );
});

Deno.test("foreach extension with an array", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["items", { element: "li", __children: "value" }],
      },
      extensions: [extensions.foreach],
      context: { items: ["foo", "bar"] },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with multiple children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["items", [{ element: "li", __children: "value" }, {
          element: "li",
          __children: "value",
        }]],
      },
      extensions: [extensions.foreach],
      context: { items: ["foo", "bar"] },
    }),
    "<ul><li>foo</li><li>foo</li><li>bar</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with an array with a nested key", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["test.items", { element: "li", __children: "value" }],
      },
      extensions: [extensions.foreach],
      context: { test: { items: ["foo", "bar"] } },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with an array of objects", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["items", { element: "li", __children: "title" }],
      },
      extensions: [extensions.foreach],
      context: { items: [{ title: "foo" }, { title: "bar" }] },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
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

Deno.test("component with props", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button", props: { children: "demo" } },
      components: { Button: { element: "button", __children: "children" } },
    }),
    "<button>demo</button>",
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

Deno.test("visibleIf causes empty render", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", visibleIf: "" },
      extensions: [extensions.visibleIf],
    }),
    "",
  );
});

Deno.test("visibleIf shows element based on context", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", visibleIf: "context.visible" },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span />",
  );
});

Deno.test("visibleIf hides element based on context", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", visibleIf: "context.visible" },
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
        visibleIf: "foo",
      },
      extensions: [extensions.visibleIf],
    }),
    "<span />",
  );
});

Deno.test("visibleIf hides element based on prop", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        props: { foo: false },
        visibleIf: "foo",
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
        visibleIf: "context.visible && foo",
      },
      extensions: [extensions.visibleIf],
      context: { visible: true },
    }),
    "<span />",
  );
});

// TODO: To test
// Expose utilities to evaluation
// Figure out how to deal with transforms -> extension?
// object notation for classes?
/*
class: 'my-4',
==class: {
  'font-bold': 'test',
}
*/
