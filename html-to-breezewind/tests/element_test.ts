import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import htmlToBreezewind from "../index.ts";

Deno.test("basic element", () => {
  assertEquals(
    htmlToBreezewind(`<div>foo</div>`),
    {
      type: "div",
      children: "foo",
    },
  );
});

Deno.test("element with an attribute", () => {
  assertEquals(
    htmlToBreezewind(`<div title="bar">foo</div>`),
    {
      type: "div",
      children: "foo",
      attributes: {
        title: "bar",
      },
    },
  );
});

Deno.test("element with a class", () => {
  assertEquals(
    htmlToBreezewind(`<div class="bar">foo</div>`),
    {
      type: "div",
      children: "foo",
      // Instead of using the class shortcut, map to an attribute directly as it is the same
      attributes: {
        class: "bar",
      },
    },
  );
});

// TODO: Test _classList
// TODO: Test _href
// TODO: Test _children
