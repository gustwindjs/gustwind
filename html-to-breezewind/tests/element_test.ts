import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import htmlToBreezewind from "../index.ts";

Deno.test("basic element", () => {
  assertEquals(
    htmlToBreezewind("<div>foo</div>"),
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

// TODO: Test class
// TODO: Test _classList
// TODO: Test _href
// TODO: Test _children
