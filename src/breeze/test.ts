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
  assertEquals(breeze(emptySpan), "<span />");
});

Deno.test("array of elements", () => {
  assertEquals(breeze([emptySpan, emptySpan]), "<span /><span />");
});

Deno.test("simple element", () => {
  assertEquals(breeze(span), "<span>testing</span>");
});

Deno.test("children element", () => {
  assertEquals(breeze(onlyChildren), "testing");
});

Deno.test("nested element", () => {
  assertEquals(
    breeze({ element: "div", children: [span] }),
    "<div><span>testing</span></div>",
  );
});

Deno.test("nested siblings", () => {
  assertEquals(
    breeze({ element: "div", children: [span, span] }),
    "<div><span>testing</span><span>testing</span></div>",
  );
});

Deno.test("nested children siblings", () => {
  assertEquals(
    breeze({ element: "div", children: [onlyChildren, onlyChildren] }),
    "<div>testingtesting</div>",
  );
});

Deno.test("multi-level nesting", () => {
  assertEquals(
    breeze({
      element: "div",
      children: [{ element: "div", children: [span] }],
    }),
    "<div><div><span>testing</span></div></div>",
  );
});

Deno.test("attributes", () => {
  assertEquals(
    breeze(hyperlink),
    '<a href="testing">testing</a>',
  );
});

Deno.test("undefined attributes", () => {
  assertEquals(
    breeze(undefinedAttribute),
    "<a>testing</a>",
  );
});

Deno.test("attributes without children", () => {
  assertEquals(
    breeze(hyperlinkWithoutChildren),
    '<a href="testing" />',
  );
});

Deno.test("class shortcut extension", () => {
  assertEquals(
    breeze(classShortcut, [extensions.classShortcut]),
    '<span class="demo">testing</span>',
  );
});

// TODO: To test
// Extension API (props)
// Context handling
// __foo - getter
// ==foo - evaluation
// Component lookup
