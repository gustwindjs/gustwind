import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "./index.ts";

const onlyChildren = { children: "testing" };
const emptySpan = { element: "span" };
const span = { element: "span", children: "testing" };

Deno.test("empty element", () => {
  assertEquals(breeze(emptySpan), "<span />");
});

Deno.test("simple element", () => {
  assertEquals(breeze(span), "<span>testing</span>");
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
