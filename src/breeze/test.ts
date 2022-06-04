import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "./index.ts";
import * as extensions from "./extensions.ts";

const onlyChildren = { children: "testing" };
const emptySpan = { element: "span" };
const span = { element: "span", children: "testing" };
const classShortcut = { element: "span", class: "demo", children: "testing" };
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

Deno.test("empty element", () => {
  assertEquals(breeze({ component: emptySpan }), "<span />");
});

Deno.test("array of elements", () => {
  assertEquals(
    breeze({ component: [emptySpan, emptySpan] }),
    "<span /><span />",
  );
});

Deno.test("simple element", () => {
  assertEquals(breeze({ component: span }), "<span>testing</span>");
});

Deno.test("children element", () => {
  assertEquals(breeze({ component: onlyChildren }), "testing");
});

Deno.test("nested element", () => {
  assertEquals(
    breeze({ component: { element: "div", children: [span] } }),
    "<div><span>testing</span></div>",
  );
});

Deno.test("nested siblings", () => {
  assertEquals(
    breeze({ component: { element: "div", children: [span, span] } }),
    "<div><span>testing</span><span>testing</span></div>",
  );
});

Deno.test("nested children siblings", () => {
  assertEquals(
    breeze({
      component: { element: "div", children: [onlyChildren, onlyChildren] },
    }),
    "<div>testingtesting</div>",
  );
});

Deno.test("multi-level nesting", () => {
  assertEquals(
    breeze({
      component: {
        element: "div",
        children: [{ element: "div", children: [span] }],
      },
    }),
    "<div><div><span>testing</span></div></div>",
  );
});

Deno.test("attributes", () => {
  assertEquals(
    breeze({ component: hyperlink }),
    '<a href="testing">testing</a>',
  );
});

Deno.test("undefined attributes", () => {
  assertEquals(
    breeze({ component: undefinedAttribute }),
    "<a>testing</a>",
  );
});

Deno.test("attributes without children", () => {
  assertEquals(
    breeze({ component: hyperlinkWithoutChildren }),
    '<a href="testing" />',
  );
});

Deno.test("class shortcut extension", () => {
  assertEquals(
    breeze({
      component: classShortcut,
      extensions: [extensions.classShortcut],
    }),
    '<span class="demo">testing</span>',
  );
});

Deno.test("context binding", () => {
  assertEquals(
    breeze({
      component: { element: "span", __children: "test" },
      context: { test: "foobar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding", () => {
  assertEquals(
    breeze({
      component: { element: "span", __children: "test.test" },
      context: { test: { test: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context binding without element", () => {
  assertEquals(
    breeze({
      component: { __children: "test" },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

// TODO: To test
// Extension API (props)
// __foo - getter for attributes
// ==foo - evaluation for children
// ==foo - evaluation for attributes
// Component lookup
