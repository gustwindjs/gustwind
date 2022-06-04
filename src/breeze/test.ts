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

Deno.test("value binding without __children", async () => {
  assertEquals(
    await breeze({ component: { element: "span", __props: "foobar" } }),
    "<span />",
  );
});

Deno.test("value binding to __children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        __props: { title: "foobar" },
        __children: "title",
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("value binding to ==children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        __props: { title: "foo" },
        "==children": "title + 'bar'",
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("value binding with attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { title: "demo" },
        __props: "foobar",
      },
    }),
    '<span title="demo" />',
  );
});

Deno.test("value binding with context", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __props: "foobar", __children: "value" },
      context: { value: "demo" },
    }),
    "<span>demo</span>",
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
      component: { element: "span", "==children": "test + 'bar'" },
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
      component: { element: "span", "==children": "test.test + 'bar'" },
      context: { test: { test: "foo" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context evaluation without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "test + 'bar'" },
      context: { test: "foo" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "test.test + 'bar'" },
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
        attributes: { __title: "test" },
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
        attributes: { __title: "test.test" },
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
        attributes: { "==title": "test + 'bar'" },
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
          "==title": "test.test + 'bar'",
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
      component: { element: "span", __class: "demo", children: "testing" },
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
        "==class": "demo + 'bar'",
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

// TODO: To test
// Component lookup
// Expose utilities to evaluation
// Figure out how to deal with transforms -> extension?
// object notation for classes?
/*
class: 'my-4',
==class: {
  'font-bold': 'test',
}
*/
